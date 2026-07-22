'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FiLogOut, FiMapPin, FiPackage, FiUser } from 'react-icons/fi';
import { clearCustomerSession, useCustomerSession } from '@/lib/customerSession';

const accountLinks = [
  { href: '/mi-cuenta/datos', label: 'Mis datos', icon: FiUser },
  { href: '/mi-cuenta/pedidos', label: 'Mis pedidos', icon: FiPackage },
  { href: '/mi-cuenta/direcciones', label: 'Mis direcciones', icon: FiMapPin },
];

export default function AccountLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, isCheckingCustomer } = useCustomerSession();

  useEffect(() => {
    if (!isCheckingCustomer && !customer) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname || '/mi-cuenta/datos')}`);
    }
  }, [customer, isCheckingCustomer, pathname, router]);

  if (isCheckingCustomer || !customer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
      </div>
    );
  }

  const handleLogout = () => {
    clearCustomerSession();
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-[240px_1fr]">
        <aside className="h-max overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-cyan-50 p-5 text-center">
            <p className="font-black text-gray-900">{customer.name}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">Mi Cuenta</p>
          </div>

          <nav className="space-y-1 p-3">
            {accountLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition',
                    isActive
                      ? 'bg-cyan-50 text-brand-cyan'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-brand-cyan',
                  ].join(' ')}
                >
                  <item.icon />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-gray-600 transition hover:bg-cyan-50 hover:text-brand-cyan"
            >
              <FiLogOut />
              Cerrar sesion
            </button>
          </nav>
        </aside>

        <main className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
