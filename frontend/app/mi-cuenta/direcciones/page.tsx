'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FiMapPin, FiTrash2 } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import {
  getCiudadesByDepartamentoProvincia,
  getDepartamentos,
  getProvinciasByDepartamento,
  normalizeDepartamento,
} from '@/lib/peru-geo';

type Address = {
  id: string;
  label: string;
  department: string;
  province: string;
  district: string;
  addressLine: string;
  reference?: string | null;
  phone?: string | null;
};

type AddressForm = {
  label: string;
  department: string;
  province: string;
  district: string;
  addressLine: string;
  reference: string;
  phone: string;
};

const initialForm: AddressForm = {
  label: '',
  department: '',
  province: '',
  district: '',
  addressLine: '',
  reference: '',
  phone: '',
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 9);
}

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const departamentos = useMemo(() => getDepartamentos(), []);
  const provincias = useMemo(
    () => getProvinciasByDepartamento(form.department),
    [form.department],
  );
  const ciudades = useMemo(
    () => getCiudadesByDepartamentoProvincia(form.department, form.province),
    [form.department, form.province],
  );
  const hasCityOptions = ciudades.length > 0;

  useEffect(() => {
    let mounted = true;

    const loadAddresses = async () => {
      try {
        const res = await api.get('/users/me/addresses');
        if (mounted) {
          setAddresses(res.data);
        }
      } catch (error) {
        if (mounted) {
          setError(getApiErrorMessage(error, 'No se pudieron cargar tus direcciones.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadAddresses();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field: keyof AddressForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleDepartmentChange = (department: string) => {
    setForm((current) => ({
      ...current,
      department,
      province: '',
      district: '',
    }));
  };

  const handleProvinceChange = (province: string) => {
    setForm((current) => ({
      ...current,
      province,
      district: '',
    }));
  };

  const validateForm = () => {
    const cleanPhone = normalizePhone(form.phone);

    if (!form.department || !form.province || !form.addressLine.trim()) {
      return 'Completa departamento, provincia y direccion.';
    }

    if (hasCityOptions && !form.district) {
      return 'Selecciona una ciudad.';
    }

    if (form.addressLine.trim().length < 5) {
      return 'La direccion debe tener al menos 5 caracteres.';
    }

    if (form.addressLine.trim().length > 150) {
      return 'La direccion no debe superar 150 caracteres.';
    }

    if (form.reference.trim().length > 150) {
      return 'La referencia no debe superar 150 caracteres.';
    }

    if (form.label.trim().length > 40) {
      return 'La etiqueta no debe superar 40 caracteres.';
    }

    if (!cleanPhone || cleanPhone.length !== 9) {
      return 'Ingresa un telefono peruano valido de 9 digitos.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const res = await api.post('/users/me/addresses', {
        label: form.label.trim(),
        department: normalizeDepartamento(form.department),
        province: form.province,
        // Campo legacy del backend: visualmente se usa como Ciudad.
        district: form.district || 'Pendiente de configurar',
        addressLine: form.addressLine.trim(),
        reference: form.reference.trim(),
        phone: normalizePhone(form.phone),
      });
      setAddresses((current) => [res.data, ...current]);
      setForm(initialForm);
      setMessage('Direccion guardada correctamente.');
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo guardar la direccion.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMessage('');
    setError('');

    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses((current) => current.filter((address) => address.id !== id));
      setMessage('Direccion eliminada correctamente.');
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo eliminar la direccion.'));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-black text-gray-900">Nueva direccion</h1>
      <p className="mt-2 text-sm font-medium text-gray-500">
        Guarda tus direcciones de entrega para futuras compras.
      </p>

      {message ? <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p> : null}
      {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-3">
          <SelectField
            label="Departamento"
            required
            value={form.department}
            onChange={handleDepartmentChange}
            options={departamentos}
            placeholder="Seleccionar departamento"
          />
          <SelectField
            label="Provincia"
            required
            value={form.province}
            onChange={handleProvinceChange}
            options={provincias}
            placeholder={form.department ? 'Seleccionar provincia' : 'Selecciona primero un departamento'}
            disabled={!form.department}
          />
          <SelectField
            label="Ciudad"
            required={hasCityOptions}
            value={form.district}
            onChange={(value) => updateField('district', value)}
            options={ciudades}
            placeholder={
              hasCityOptions
                ? 'Seleccionar ciudad'
                : form.province
                  ? 'Ciudades pendientes de configuracion'
                  : 'Selecciona primero una provincia'
            }
            disabled={!hasCityOptions}
          />
        </div>

        <Field
          label="Direccion"
          required
          value={form.addressLine}
          maxLength={150}
          onChange={(value) => updateField('addressLine', value)}
        />
        <Field
          label="Detalles / Referencia"
          value={form.reference}
          maxLength={150}
          onChange={(value) => updateField('reference', value)}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            label="Etiqueta"
            placeholder="Casa, oficina, trabajo, etc."
            value={form.label}
            maxLength={40}
            onChange={(value) => updateField('label', value)}
          />
          <Field
            label="Telefono de contacto"
            required
            value={form.phone}
            inputMode="numeric"
            maxLength={9}
            onChange={(value) => updateField('phone', normalizePhone(value))}
          />
        </div>

        <button
          disabled={saving}
          className="rounded-xl bg-brand-cyan px-8 py-3 text-sm font-black text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar direccion'}
        </button>
      </form>

      <section className="mt-10">
        <h2 className="text-xl font-black text-gray-900">Mis direcciones</h2>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <FiMapPin className="mx-auto text-4xl text-brand-cyan" />
            <p className="mt-3 text-sm font-bold text-gray-700">Aun no tienes direcciones registradas.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{address.label || 'Direccion'}</h3>
                    <p className="mt-2 text-sm font-bold text-gray-700">{address.addressLine}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {address.district}, {address.province}, {address.department}
                    </p>
                    {address.reference ? <p className="mt-2 text-sm text-gray-500">Ref: {address.reference}</p> : null}
                    {address.phone ? <p className="mt-1 text-sm text-gray-500">Tel: {address.phone}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(address.id)}
                    className="rounded-xl bg-red-50 p-3 text-red-600 transition hover:bg-red-100"
                    aria-label="Eliminar direccion"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  placeholder = '',
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-gray-900">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-brand-cyan"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
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
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-cyan disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
