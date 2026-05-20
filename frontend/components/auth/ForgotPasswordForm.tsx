'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';

type ForgotPasswordFormProps = {
  flow: 'admin' | 'client';
  title: string;
  description: string;
  loginPath: string;
  emailPlaceholder: string;
  shellClassName: string;
  cardClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  inputClassName: string;
  buttonClassName: string;
  linkClassName: string;
  messageClassName: string;
  errorClassName: string;
};

export function ForgotPasswordForm({
  flow,
  title,
  description,
  loginPath,
  emailPlaceholder,
  shellClassName,
  cardClassName,
  titleClassName,
  descriptionClassName,
  inputClassName,
  buttonClassName,
  linkClassName,
  messageClassName,
  errorClassName,
}: ForgotPasswordFormProps) {
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
      const res = await api.post('/users/forgot-password', { email, flow });
      setMessage(res.data.message);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo procesar la solicitud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={shellClassName}>
      <div className={cardClassName}>
        <h1 className={titleClassName}>{title}</h1>
        <p className={descriptionClassName}>{description}</p>

        {message && <p className={messageClassName}>{message}</p>}
        {error && <p className={errorClassName}>{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            aria-label="Correo electronico"
            placeholder={emailPlaceholder}
            className={inputClassName}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={isSubmitting} className={buttonClassName}>
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <Link href={loginPath} className={linkClassName}>
          Volver al inicio de sesion
        </Link>
      </div>
    </div>
  );
}
