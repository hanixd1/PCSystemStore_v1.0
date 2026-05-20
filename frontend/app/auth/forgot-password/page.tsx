'use client';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function CustomerForgotPasswordPage() {
  return (
    <ForgotPasswordForm
      flow="client"
      title="Recuperar contrasena"
      description="Ingresa el correo asociado a tu cuenta para recibir las instrucciones de recuperacion."
      loginPath="/auth/login"
      emailPlaceholder="Ingresa tu correo electronico"
      shellClassName="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"
      cardClassName="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      titleClassName="mb-2 text-center text-3xl font-black text-gray-900"
      descriptionClassName="mb-6 text-center text-sm text-gray-500"
      inputClassName="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
      buttonClassName="w-full rounded-lg bg-orange-400 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      linkClassName="mt-5 block text-center text-sm font-bold text-brand-cyan hover:underline"
      messageClassName="mb-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700"
      errorClassName="mb-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700"
    />
  );
}
