'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FiMapPin, FiTrash2 } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';

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

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.department.trim() || !form.province.trim() || !form.district.trim() || !form.addressLine.trim()) {
      setError('Completa departamento, provincia, distrito y dirección.');
      return;
    }

    setSaving(true);

    try {
      const res = await api.post('/users/me/addresses', {
        label: form.label,
        department: form.department,
        province: form.province,
        district: form.district,
        addressLine: form.addressLine,
        reference: form.reference,
        phone: form.phone,
      });
      setAddresses((current) => [res.data, ...current]);
      setForm(initialForm);
      setMessage('Dirección guardada correctamente.');
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo guardar la dirección.'));
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
      setMessage('Dirección eliminada correctamente.');
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo eliminar la dirección.'));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-black text-gray-900">Nueva dirección</h1>
      <p className="mt-2 text-sm font-medium text-gray-500">
        Guarda tus direcciones de entrega para futuras compras.
      </p>

      {message ? <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p> : null}
      {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Departamento / Región" required value={form.department} onChange={(value) => updateField('department', value)} />
            <Field label="Provincia / Ciudad" required value={form.province} onChange={(value) => updateField('province', value)} />
            <Field label="Distrito / Cod. Postal" required value={form.district} onChange={(value) => updateField('district', value)} />
          </div>

          <Field label="Dirección" required value={form.addressLine} onChange={(value) => updateField('addressLine', value)} />
          <Field label="Detalles / Referencia" value={form.reference} onChange={(value) => updateField('reference', value)} />
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Etiqueta" placeholder="Casa, oficina, etc." value={form.label} onChange={(value) => updateField('label', value)} />
            <Field label="Teléfono de contacto" value={form.phone} onChange={(value) => updateField('phone', value)} />
          </div>

          <button
            disabled={saving}
            className="rounded-xl bg-brand-cyan px-8 py-3 text-sm font-black text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar dirección'}
          </button>
        </form>

        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 p-6 text-center">
          <div>
            <FiMapPin className="mx-auto text-5xl text-brand-cyan" />
            <h2 className="mt-4 text-lg font-black text-gray-900">Mapa no disponible</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
              Google Maps no se carga en este entorno sin una API Key válida.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-black text-gray-900">Mis direcciones</h2>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <FiMapPin className="mx-auto text-4xl text-brand-cyan" />
            <p className="mt-3 text-sm font-bold text-gray-700">Aún no tienes direcciones registradas.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{address.label || 'Dirección'}</h3>
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
                    aria-label="Eliminar dirección"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-gray-900">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-brand-cyan"
      />
    </label>
  );
}
