'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
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
      const res = await api.post('/users/forgot-password', { email, flow: 'admin' });
      setMessage(res.data.message);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo procesar la solicitud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center">
        <h2 className="mb-4 text-2xl font-bold">ADMIN PANEL</h2>
        <p className="mb-6 text-gray-500">
          Ingresa tu correo administrativo para recibir instrucciones.
        </p>

        {message && <p className="mb-4 font-bold text-green-600">{message}</p>}
        {error && <p className="mb-4 font-bold text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Ingresa tu correo administrativo"
            className="w-full rounded-lg border p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-cyan py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
        <Link href="/admin/login" className="mt-4 block text-sm text-gray-500">
          Volver al login
        </Link>
      </div>
    </div>
  );
}
