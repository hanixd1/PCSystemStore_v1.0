'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiAward, FiEye, FiEyeOff, FiTruck } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { api, getApiErrorMessage } from '@/lib/api';
import { PASSWORD_MIN_LENGTH, getSafeRedirectPath } from '@/lib/auth-policy';
import { notifyCustomerSessionChanged } from '@/lib/customerSession';

type Mode = 'login' | 'register';

function isValidEmailFormat(value: string): boolean {
  const email = value.trim();
  const atIndex = email.indexOf('@');
  const lastAtIndex = email.lastIndexOf('@');

  if (!email || email.includes(' ') || atIndex <= 0 || atIndex !== lastAtIndex) {
    return false;
  }

  const domain = email.slice(atIndex + 1);
  const lastDotIndex = domain.lastIndexOf('.');

  return lastDotIndex > 0 && domain.slice(lastDotIndex + 1).length >= 2;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Email of an account still unverified (just registered, or signed in without verifying), so
  // its verification link can be sent again.
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  // Signed in with an unverified email: the session is saved and the customer chooses when to go on.
  const [pendingRedirect, setPendingRedirect] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const persistSession = (
    user: { role: string; email?: string; emailVerified?: boolean },
    redirectOverride?: string,
  ) => {
    if (user.role !== 'CUSTOMER') {
      setError('Esta cuenta no esta registrada como cliente.');
      return;
    }

    localStorage.setItem('customerUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));

    notifyCustomerSessionChanged();
    const redirectTo = new URLSearchParams(window.location.search).get('redirect');
    const target = getSafeRedirectPath(redirectOverride || redirectTo);
    if (user.emailVerified === false) {
      // Checkout needs a verified email: offer the link now instead of failing later.
      setPendingVerificationEmail(user.email || formData.email.trim());
      setPendingRedirect(target);
      setSuccess('Iniciaste sesion, pero tu correo aun no esta verificado.');
      return;
    }
    window.location.href = target;
  };

  useEffect(() => {
    const googleError = new URLSearchParams(window.location.search).get('googleError');
    if (googleError) {
      setError(googleError);
    }
  }, []);

  const startGoogleOAuth = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      sessionStorage.setItem('googleOAuthMode', mode);
      const res = await api.get('/users/google/oauth-url', { params: { mode } });
      const authUrl = res.data?.authUrl;

      if (typeof authUrl !== 'string' || !authUrl.startsWith('https://accounts.google.com/')) {
        throw new Error('No se pudo iniciar el flujo seguro de Google.');
      }

      window.location.href = authUrl;
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo iniciar sesion con Google'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await api.post('/users/resend-verification', {
        email: pendingVerificationEmail,
      });
      setSuccess(res.data?.message || 'Te enviamos un nuevo enlace de verificacion.');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo reenviar el correo de verificacion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateRegisterForm = (): string | null => {
    if (!isValidEmailFormat(formData.email)) {
      return 'Ingresa un correo valido con dominio completo.';
    }

    if (!formData.password || formData.password.length < PASSWORD_MIN_LENGTH) {
      return `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (!formData.confirmPassword) {
      return 'Confirma tu contrasena.';
    }

    if (formData.confirmPassword.length < PASSWORD_MIN_LENGTH) {
      return `La confirmacion debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Las contrasenas no coinciden.';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await api.post('/users/customer-login', {
          email: formData.email,
          password: formData.password,
        });

        persistSession(res.data.user);
        return;
      }

      const validationError = validateRegisterForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      const res = await api.post('/users/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setSuccess(
        res.data.message || 'Cuenta creada correctamente. Ahora ya puedes iniciar sesion.',
      );
      setPendingVerificationEmail(formData.email.trim());
      setMode('login');
      setFormData((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
      }));
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo completar la operacion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-5xl flex-col gap-12 p-2 md:flex-row md:p-0">
          <div className="hidden w-1/2 flex-col justify-center border-r border-gray-200 pr-12 md:flex">
            <div className="mb-2 flex items-center gap-4">
              <span className="text-2xl font-black tracking-tighter text-gray-900">PC SYSTEM</span>
              <span className="rounded bg-brand-cyan px-2 py-0.5 text-xs font-bold text-white">
                ID
              </span>
            </div>

            <div className="mt-12 space-y-8">
              <div className="flex gap-4">
                <div className="h-fit rounded-xl bg-gray-50 p-3">
                  <FiTruck className="text-2xl text-gray-800" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Gestiona tus pedidos aqui</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Mantén el control total. Revisa el estado de tus envíos y entérate al instante
                    de dónde están tus nuevos equipos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-fit rounded-xl bg-gray-50 p-3">
                  <FiAward className="text-2xl text-gray-800" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Lista de productos personalizado
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Añade las mejores partes a tu lista de favoritos y ten todo listo para armar tu
                    PC ideal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col justify-center md:w-1/2">
            <div className="mb-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === 'login'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Iniciar sesion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setSuccess('');
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === 'register'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <h2 className="mb-8 text-3xl font-black text-gray-900">
              {mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
            </h2>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
                {success}
                {pendingVerificationEmail ? (
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={isSubmitting}
                    className="ml-1 underline disabled:opacity-60"
                  >
                    Reenviar correo de verificacion
                  </button>
                ) : null}
                {pendingRedirect ? (
                  <a href={pendingRedirect} className="ml-2 underline">
                    Continuar
                  </a>
                ) : null}
              </p>
            )}

            <button
              type="button"
              onClick={startGoogleOAuth}
              disabled={isSubmitting}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FcGoogle className="text-2xl" />
              {mode === 'register' ? 'Crear cuenta con Google' : 'Acceder con Google'}
            </button>

            <div className="relative mb-6 flex items-center py-2">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-4 flex-shrink-0 text-sm text-gray-400">O bien</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <input
                    type="text"
                    placeholder="Nombre completo*"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="E-mail*"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contrasena*"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={mode === 'register' ? PASSWORD_MIN_LENGTH : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {mode === 'register' && (
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirmar contrasena*"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end text-sm">
                {mode === 'login' && (
                  <Link
                    href="/auth/forgot-password"
                    className="whitespace-nowrap font-semibold text-gray-900 underline underline-offset-4 transition hover:text-brand-cyan"
                  >
                    Olvidé mi contraseña
                  </Link>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-lg bg-brand-cyan py-4 text-lg font-black text-gray-950 shadow-md shadow-cyan-200/70 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Procesando...'
                  : mode === 'login'
                    ? 'Iniciar sesion'
                    : 'Crear cuenta'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
