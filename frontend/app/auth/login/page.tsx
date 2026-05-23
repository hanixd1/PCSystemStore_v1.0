'use client';

import { FormEvent, useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { FiAward, FiEye, FiEyeOff, FiTruck } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { api, getApiErrorMessage } from '@/lib/api';
import { notifyCustomerSessionChanged } from '@/lib/customerSession';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme: string; size: string; shape: string; width?: number },
          ) => void;
        };
      };
    };
  }
}

type Mode = 'login' | 'register';

export default function LoginPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const persistSession = (user: { role: string }) => {
    if (user.role !== 'CUSTOMER') {
      setError('Esta cuenta no esta registrada como cliente.');
      return;
    }

    localStorage.setItem('customerUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));

    notifyCustomerSessionChanged();
    const redirectTo = new URLSearchParams(window.location.search).get('redirect');
    window.location.href = redirectTo?.startsWith('/') ? redirectTo : '/';
  };

  const handleGoogleAuth = useEffectEvent(async (idToken?: string) => {
    if (!idToken) {
      setError('Google no devolvio un token valido');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/users/google-login', { credential: idToken });
      persistSession(res.data.user);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo iniciar sesion con Google'));
    } finally {
      setIsSubmitting(false);
    }
  });

  useEffect(() => {
    if (!googleReady || !googleClientId || !window.google || !googleButtonRef.current) {
      return;
    }

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => {
        void handleGoogleAuth(credential);
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: 360,
    });
  }, [googleClientId, googleReady]);

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

      const res = await api.post('/users/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      setSuccess(
        res.data.message || 'Cuenta creada correctamente. Ahora ya puedes iniciar sesion.',
      );
      setMode('login');
      setFormData((current) => ({
        ...current,
        password: '',
      }));
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'No se pudo completar la operacion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
      />

      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-5xl flex-col gap-12 overflow-hidden rounded-2xl bg-white p-8 shadow-sm md:flex-row md:p-12">
          <div className="hidden w-1/2 flex-col justify-center border-r border-gray-100 pr-12 md:flex">
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
                  <h3 className="text-lg font-bold text-gray-900">Gestiona tus pedidos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Ten el control de todos tus pedidos y recibe notificaciones con el seguimiento
                    en tiempo real.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-fit rounded-xl bg-gray-50 p-3">
                  <FiAward className="text-2xl text-gray-800" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Lista de deseos personalizada</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Guarda tus productos favoritos para armar tu PC cuando estes listo.
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
              </p>
            )}

            {googleClientId ? (
              <div className="mb-6" ref={googleButtonRef} />
            ) : (
              <button
                type="button"
                onClick={() =>
                  setError('Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID para usar Google')
                }
                className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FcGoogle className="text-2xl" />
                Acceder con Google
              </button>
            )}

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
                  minLength={6}
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

              <div className="flex items-center justify-end text-sm">
                {mode === 'login' && (
                  <Link
                    href="/auth/forgot-password"
                    className="whitespace-nowrap font-bold text-brand-cyan hover:underline"
                  >
                    Olvidé mi contraseña
                  </Link>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-lg bg-orange-400 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
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
