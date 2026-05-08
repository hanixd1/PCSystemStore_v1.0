'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/users/forgot-password', { email, flow: 'client' });
      setMessage(res.data.message);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo procesar la solicitud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-3xl font-black text-gray-900">
          Recuperar contraseña
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Ingresa el correo asociado a tu cuenta para recibir las instrucciones de recuperación.
        </p>

        {message && (
          <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Ingresa tu correo electrónico"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-orange-400 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
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
