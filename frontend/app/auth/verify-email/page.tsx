'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';

function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  const [message, setMessage] = useState('Verificando tu correo...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('El enlace de verificacion no es valido.');
      setMessage('');
      return;
    }

    api
      .post('/users/verify-email', { token })
      .then((res) => setMessage(res.data.message || 'Correo verificado correctamente.'))
      .catch((error: unknown) => {
        setMessage('');
        setError(getApiErrorMessage(error, 'No se pudo verificar el correo.'));
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-black text-gray-900">Verificacion de correo</h1>
        {message ? (
          <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
        ) : null}
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-lg bg-orange-400 px-5 py-3 font-bold text-white"
        >
          Ir a iniciar sesion
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
