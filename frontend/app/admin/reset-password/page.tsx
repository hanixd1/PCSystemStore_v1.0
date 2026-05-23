'use client';

import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

function AdminResetForm() {
  return (
    <ResetPasswordForm
      flow="admin"
      title="ADMIN PANEL"
      description="Crea una nueva contrasena administrativa."
      loginPath="/admin/login"
      passwordPlaceholder="Escribe tu nueva clave"
      confirmPasswordPlaceholder="Confirma tu nueva clave"
      successMessage="Contrasena cambiada. Ahora inicia sesion."
      errorFallback="El token es invalido o expiro"
      shellClassName="flex min-h-screen items-center justify-center bg-gray-900 p-4"
      cardClassName="w-full max-w-md rounded-xl bg-white p-8"
      titleClassName="mb-4 text-center text-2xl font-bold"
      descriptionClassName="mb-6 text-center text-sm text-gray-500"
      inputClassName="w-full rounded-lg border p-3"
      buttonClassName="w-full rounded-lg bg-black py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      errorClassName="mb-4 text-center font-bold text-red-600"
    />
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AdminResetForm />
    </Suspense>
  );
}
