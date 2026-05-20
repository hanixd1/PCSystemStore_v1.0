'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FiActivity,
  FiBarChart2,
  FiCreditCard,
  FiGrid,
  FiImage,
  FiLogOut,
  FiPlusSquare,
  FiUsers,
} from 'react-icons/fi';
import { AUTHORIZED_ADMIN_ROLES, clearStoredAuthSession, api } from '@/lib/api';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function readSessionUser(): SessionUser | null {
  try {
    const userStored = localStorage.getItem('adminUser') || localStorage.getItem('user');
    if (!userStored) {
      return null;
    }

    const parsedUser = JSON.parse(userStored) as SessionUser;
    if (!AUTHORIZED_ADMIN_ROLES.has(parsedUser.role)) {
      return null;
    }

    return parsedUser;
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const isPublicAdminRoute =
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/admin/forgot-password') ||
    pathname?.startsWith('/admin/reset-password');

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      if (cancelled) {
        return;
      }

      if (isPublicAdminRoute) {
        setCurrentUser(null);
        setIsCheckingSession(false);
        return;
      }

      try {
        const res = await api.get('/users/admin-me');
        const sessionUser = res.data as SessionUser;
        if (!AUTHORIZED_ADMIN_ROLES.has(sessionUser.role)) {
          throw new Error('Rol administrativo invalido');
        }

        localStorage.setItem('adminUser', JSON.stringify(sessionUser));
        localStorage.setItem('user', JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);
        setIsCheckingSession(false);
        return;
      } catch {
        const sessionUser = readSessionUser();
        if (!sessionUser) {
          clearStoredAuthSession();
          setCurrentUser(null);
          setIsCheckingSession(false);
          router.replace('/admin/login');
          return;
        }

        clearStoredAuthSession();
        setCurrentUser(null);
        setIsCheckingSession(false);
        router.replace('/admin/login');
        return;
      }
    };

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, [isPublicAdminRoute, router]);

  const handleLogout = async () => {
    await api.post('/users/admin-logout').catch(() => undefined);
    clearStoredAuthSession();
    setCurrentUser(null);
    router.replace('/admin/login');
  };

  if (isPublicAdminRoute) {
    return <>{children}</>;
  }

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      <aside className="relative z-50 flex h-full w-64 shrink-0 flex-col bg-[#1a1f2b] text-white">
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <h2 className="text-2xl font-black tracking-tighter text-white">
            ADMIN<span className="text-brand-cyan">PANEL</span>
          </h2>
        </div>

        <div className="border-b border-gray-800 bg-[#151923] p-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
            Conectado como
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cyan font-bold text-gray-900">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold">{currentUser.name}</p>
              <p
                className={[
                  'mt-1 w-max rounded-full px-2 py-0.5 text-[10px] font-bold',
                  currentUser.role === 'ADMIN'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-blue-500/20 text-blue-400',
                ].join(' ')}
              >
                {currentUser.role}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-4 px-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Barra de opciones
          </p>

          <Link
            href="/admin"
            className={[
              'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
              pathname === '/admin'
                ? 'bg-brand-cyan font-bold text-gray-900'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            ].join(' ')}
          >
            <FiGrid size={20} /> Panel Principal
          </Link>

          <Link
            href="/admin/add-product"
            className={[
              'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
              pathname === '/admin/add-product'
                ? 'bg-brand-cyan font-bold text-gray-900'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            ].join(' ')}
          >
            <FiPlusSquare size={20} /> Agregar Producto
          </Link>

          {currentUser.role === 'ADMIN' ? (
            <div className="mt-4 border-t border-gray-800 pt-6">
              <p className="mb-4 px-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                Opciones avanzadas
              </p>

              <Link
                href="/admin/empleados"
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                  pathname === '/admin/empleados'
                    ? 'bg-brand-cyan font-bold text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')}
              >
                <FiUsers size={20} /> Empleados
              </Link>

              <Link
                href="/admin/historial"
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                  pathname === '/admin/historial'
                    ? 'bg-brand-cyan font-bold text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')}
              >
                <FiActivity size={20} /> Historial
              </Link>

              <Link
                href="/admin/pagos"
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                  pathname === '/admin/pagos'
                    ? 'bg-brand-cyan font-bold text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')}
              >
                <FiCreditCard size={20} /> Pagos
              </Link>

              <Link
                href="/admin/banners"
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                  pathname === '/admin/banners'
                    ? 'bg-brand-cyan font-bold text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')}
              >
                <FiImage size={20} /> Banners y marca
              </Link>

              <Link
                href="/admin/estadistica"
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                  pathname === '/admin/estadistica'
                    ? 'bg-brand-cyan font-bold text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')}
              >
                <FiBarChart2 size={20} /> Estadistica
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="mt-auto border-t border-gray-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 font-medium text-red-400 transition-all hover:bg-red-500/10"
          >
            <FiLogOut size={20} /> Cerrar Sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
