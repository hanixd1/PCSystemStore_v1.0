'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';

function SetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/users/customer-set-password', {
        token,
        password,
        confirmPassword,
      });
      setMessage('Contrasena creada correctamente. Ya puedes iniciar sesion.');
      setTimeout(() => router.push('/auth/login'), 1200);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo crear la contrasena.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-center text-3xl font-black text-gray-900">Crear contrasena</h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Define una contrasena para entrar tambien con correo y clave.
        </p>

        {message ? (
          <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="Nueva contrasena"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-cyan"
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder="Confirmar contrasena"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-cyan"
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={!token || isSubmitting}
            className="w-full rounded-lg bg-orange-400 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Crear contrasena'}
          </button>
        </form>

        <Link
          href="/auth/login"
          className="mt-5 block text-center text-sm font-bold text-brand-cyan hover:underline"
        >
          Volver al inicio de sesion
        </Link>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
