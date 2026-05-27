'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';

type ResetPasswordFormProps = {
  flow: 'admin' | 'client';
  title: string;
  description: string;
  loginPath: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  successMessage: string;
  errorFallback: string;
  shellClassName: string;
  cardClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  inputClassName: string;
  buttonClassName: string;
  errorClassName: string;
  linkClassName?: string;
};

export function ResetPasswordForm({
  flow,
  title,
  description,
  loginPath,
  passwordPlaceholder,
  confirmPasswordPlaceholder,
  successMessage,
  errorFallback,
  shellClassName,
  cardClassName,
  titleClassName,
  descriptionClassName,
  inputClassName,
  buttonClassName,
  errorClassName,
  linkClassName,
}: ResetPasswordFormProps) {
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
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        flow === 'admin' ? '/users/admin-reset-password' : '/users/customer-reset-password';
      await api.post(endpoint, {
        token,
        newPassword: password,
      });
      notify.success(successMessage);
      router.push(loginPath);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, errorFallback));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={shellClassName}>
      <div className={cardClassName}>
        <h1 className={titleClassName}>{title}</h1>
        <p className={descriptionClassName}>{description}</p>

        {error && <p className={errorClassName}>{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            aria-label="Nueva contrasena"
            placeholder={passwordPlaceholder}
            className={inputClassName}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <input
            type="password"
            aria-label="Confirmar nueva contrasena"
            placeholder={confirmPasswordPlaceholder}
            className={inputClassName}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" disabled={!token || isSubmitting} className={buttonClassName}>
            {isSubmitting ? 'Guardando...' : 'Cambiar Contrasena'}
          </button>
        </form>

        {linkClassName ? (
          <Link href={loginPath} className={linkClassName}>
            Volver al inicio de sesion
          </Link>
        ) : null}
      </div>
    </div>
  );
}
