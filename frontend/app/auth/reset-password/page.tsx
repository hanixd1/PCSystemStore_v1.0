'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';

function CustomerResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/users/reset-password', {
        token,
        newPassword: password,
      });
      alert('Contraseña cambiada. Ahora inicia sesión.');
      router.push('/auth/login');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'El enlace es inválido o expiró'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-3xl font-black text-gray-900">Nueva contraseña</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Crea una nueva contraseña para tu cuenta.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={!token || isSubmitting}
            className="w-full rounded-lg bg-orange-400 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>

        <Link
          href="/auth/login"
          className="mt-5 block text-center text-sm font-bold text-brand-cyan hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CustomerResetForm />
    </Suspense>
  );
}
