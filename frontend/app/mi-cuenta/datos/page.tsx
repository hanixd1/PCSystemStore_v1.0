'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { notifyCustomerSessionChanged } from '@/lib/customerSession';

type ProfileForm = {
  name: string;
  lastName: string;
  birthDate: string;
  documentType: string;
  documentNumber: string;
  gender: string;
  mobilePhone: string;
  email: string;
  confirmEmail: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialForm: ProfileForm = {
  name: '',
  lastName: '',
  birthDate: '',
  documentType: 'DNI',
  documentNumber: '',
  gender: 'Masculino',
  mobilePhone: '',
  email: '',
  confirmEmail: '',
};

export default function AccountDataPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'password'>('account');
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [hasLockedDocument, setHasLockedDocument] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const res = await api.get('/users/me');
        if (!mounted) return;

        const [firstName, ...restNames] = String(res.data.name || '').split(' ');
        const birthDate = res.data.birthDate ? String(res.data.birthDate).slice(0, 10) : '';

        setForm((current) => ({
          ...current,
          name: firstName || res.data.name || '',
          lastName: restNames.join(' '),
          birthDate,
          documentType: res.data.documentType || 'DNI',
          documentNumber: res.data.documentNumber || '',
          gender: res.data.gender || 'Masculino',
          mobilePhone: res.data.mobilePhone || '',
          email: res.data.email || '',
          confirmEmail: res.data.email || '',
        }));
        setHasLockedDocument(Boolean(res.data.documentNumber));
      } catch (error) {
        if (mounted) {
          setError(getApiErrorMessage(error, 'No se pudieron cargar tus datos.'));
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase()) {
      setError('El correo electronico y la confirmacion deben coincidir.');
      return;
    }

    setIsSaving(true);

    try {
      const fullName = `${form.name} ${form.lastName}`.replace(/\s+/g, ' ').trim();
      const payload: Record<string, string> = {
        name: fullName,
        email: form.email,
        gender: form.gender,
        mobilePhone: form.mobilePhone,
      };

      if (form.birthDate.trim()) {
        payload.birthDate = form.birthDate;
      }

      if (!hasLockedDocument && form.documentNumber.trim()) {
        payload.documentType = form.documentType;
        payload.documentNumber = form.documentNumber;
      }

      const res = await api.patch('/users/me/profile', payload);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      notifyCustomerSessionChanged();
      setHasLockedDocument(Boolean(res.data.user.documentNumber));
      setMessage(res.data.message || 'Datos actualizados correctamente.');
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudieron guardar tus datos.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setError('Completa todos los campos de contrasena.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('La nueva contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('La confirmacion de contrasena no coincide.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await api.patch('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(res.data.message || 'Contrasena actualizada correctamente.');
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo cambiar la contrasena.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-black text-gray-900">Mis datos</h1>

      <div className="mt-5 flex gap-8 border-b border-gray-200">
        <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')}>
          Informacion de cuenta
        </TabButton>
        <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
          Cambiar contrasena
        </TabButton>
      </div>

      {message ? (
        <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
      ) : null}

      {activeTab === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="mt-8 max-w-3xl space-y-6">
          <Field
            label="Contrasena actual"
            required
            type="password"
            value={passwordForm.currentPassword}
            onChange={(value) =>
              setPasswordForm((current) => ({ ...current, currentPassword: value }))
            }
          />
          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Nueva contrasena"
              required
              type="password"
              value={passwordForm.newPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, newPassword: value }))
              }
            />
            <Field
              label="Confirmar contrasena nueva"
              required
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: value }))
              }
            />
          </div>
          <SaveButton isSaving={isSaving} />
        </form>
      ) : (
        <form onSubmit={handleProfileSubmit} className="mt-8 space-y-10">
          <section>
            <h2 className="mb-6 text-xl font-black text-gray-900">Informacion Personal</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Field
                label="Nombre"
                required
                value={form.name}
                onChange={(value) => updateField('name', value)}
              />
              <Field
                label="Apellidos"
                required
                value={form.lastName}
                onChange={(value) => updateField('lastName', value)}
              />
              <Field
                label="Fecha de nacimiento"
                type="date"
                value={form.birthDate}
                onChange={(value) => updateField('birthDate', value)}
              />
              <SelectField
                label="Tipo de documento"
                required
                disabled={hasLockedDocument}
                value={form.documentType}
                options={['DNI', 'Carnet de extranjeria', 'Pasaporte']}
                onChange={(value) => updateField('documentType', value)}
              />
              <Field
                label="Numero de documento"
                required
                disabled={hasLockedDocument}
                value={form.documentNumber}
                onChange={(value) => updateField('documentNumber', value)}
              />
              <SelectField
                label="Sexo"
                value={form.gender}
                options={['Masculino', 'Femenino', 'Prefiero no decirlo']}
                onChange={(value) => updateField('gender', value)}
              />
            </div>
            {hasLockedDocument ? (
              <p className="mt-3 text-xs font-bold text-gray-500">
                El documento no puede modificarse despues de ser registrado.
              </p>
            ) : null}
          </section>

          <section className="border-t border-gray-200 pt-8">
            <h2 className="mb-6 text-xl font-black text-gray-900">Informacion de cuenta</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Field
                label="Numero de celular"
                value={form.mobilePhone}
                onChange={(value) => updateField('mobilePhone', value)}
              />
              <Field
                label="Correo electronico"
                required
                type="email"
                value={form.email}
                onChange={(value) => updateField('email', value)}
              />
              <Field
                label="Confirmar correo electronico"
                required
                type="email"
                value={form.confirmEmail}
                onChange={(value) => updateField('confirmEmail', value)}
              />
            </div>
          </section>

          <SaveButton isSaving={isSaving} />
        </form>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'border-b-4 pb-3 text-sm transition',
        active
          ? 'border-brand-cyan font-black text-gray-900'
          : 'border-transparent font-medium text-gray-500 hover:text-brand-cyan',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SaveButton({ isSaving }: { isSaving: boolean }) {
  return (
    <button
      disabled={isSaving}
      className="rounded-xl bg-brand-cyan px-10 py-3 text-sm font-black text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSaving ? 'Guardando...' : 'Guardar'}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-gray-900">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-brand-cyan disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-gray-900">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded border border-gray-300 px-4 text-sm text-gray-700 outline-none transition focus:border-brand-cyan disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
