'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/users/reset-password', {
        token,
        newPassword: password,
      });
      alert('Contrasena cambiada. Ahora inicia sesion.');
      router.push('/admin/login');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'El token es invalido o expiro'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8">
        <h2 className="mb-4 text-center text-2xl font-bold">Nueva Contrasena</h2>
        {error && <p className="mb-4 text-center font-bold text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Escribe tu nueva clave"
            className="w-full rounded-lg border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={!token || isSubmitting}
            className="w-full rounded-lg bg-black py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Cambiar Contrasena'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetForm />
    </Suspense>
  );
}
