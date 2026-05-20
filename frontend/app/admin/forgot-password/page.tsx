'use client';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <ForgotPasswordForm
      flow="admin"
      title="ADMIN PANEL"
      description="Ingresa tu correo administrativo para recibir instrucciones."
      loginPath="/admin/login"
      emailPlaceholder="Ingresa tu correo administrativo"
      shellClassName="flex min-h-screen items-center justify-center bg-gray-900 p-4"
      cardClassName="w-full max-w-md rounded-xl bg-white p-8 text-center"
      titleClassName="mb-4 text-2xl font-bold"
      descriptionClassName="mb-6 text-gray-500"
      inputClassName="w-full rounded-lg border p-3"
      buttonClassName="w-full rounded-lg bg-brand-cyan py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
      linkClassName="mt-4 block text-sm text-gray-500"
      messageClassName="mb-4 font-bold text-green-600"
      errorClassName="mb-4 font-bold text-red-600"
    />
  );
}
