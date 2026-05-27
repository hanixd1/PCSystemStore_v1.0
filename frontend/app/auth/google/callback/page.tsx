'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { notifyCustomerSessionChanged } from '@/lib/customerSession';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = 'Validando acceso con Google...';

  useEffect(() => {
    let cancelled = false;

    const finishGoogleOAuth = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        router.replace(
          '/auth/login?googleError=Google no devolvio los datos necesarios para iniciar sesion.',
        );
        return;
      }

      try {
        const res = await api.post('/users/google/callback', { code, state });
        const user = res.data?.user;

        if (!user || user.role !== 'CUSTOMER') {
          throw new Error('Esta cuenta no esta registrada como cliente.');
        }

        localStorage.setItem('customerUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
        notifyCustomerSessionChanged();

        const mode = sessionStorage.getItem('googleOAuthMode');
        sessionStorage.removeItem('googleOAuthMode');
        router.replace(mode === 'register' ? '/mi-cuenta/datos' : '/');
      } catch (error: unknown) {
        if (!cancelled) {
          const errorMessage = getApiErrorMessage(
            error,
            'No se pudo completar el acceso con Google.',
          );
          router.replace(`/auth/login?googleError=${encodeURIComponent(errorMessage)}`);
        }
      }
    };

    void finishGoogleOAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
        <h1 className="text-2xl font-black text-gray-900">Google OAuth</h1>
        <p className="mt-3 text-sm font-medium text-gray-500">{message}</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
          <p className="text-sm font-bold text-gray-600">Validando acceso con Google...</p>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
