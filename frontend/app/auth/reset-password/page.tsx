'use client';

import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

function CustomerResetForm() {
  return (
    <ResetPasswordForm
      title="Nueva contrasena"
      description="Crea una nueva contrasena para tu cuenta."
      loginPath="/auth/login"
      passwordPlaceholder="Nueva contrasena"
      confirmPasswordPlaceholder="Confirmar contrasena"
      successMessage="Contrasena cambiada. Ahora inicia sesion."
      errorFallback="El enlace es invalido o expiro"
      shellClassName="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"
      cardClassName="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      titleClassName="mb-2 text-center text-3xl font-black text-gray-900"
      descriptionClassName="mb-6 text-center text-sm text-gray-500"
      inputClassName="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
      buttonClassName="w-full rounded-lg bg-orange-400 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      errorClassName="mb-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700"
      linkClassName="mt-5 block text-center text-sm font-bold text-brand-cyan hover:underline"
    />
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CustomerResetForm />
    </Suspense>
  );
}
