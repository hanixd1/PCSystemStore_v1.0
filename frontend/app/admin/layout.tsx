// frontend/app/admin/layout.tsx
'use client'; // <--- IMPORTANTE: Convertir a Client Component para usar Hooks

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Si estamos en la página de login, no hacemos nada
    if (pathname === '/admin/login') {
      setAuthorized(true);
      return;
    }

    // Verificar si existe la sesión
    const session = localStorage.getItem('adminSession');
    if (!session) {
      router.push('/admin/login');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  // Si estamos en login, renderizamos sin sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Si no está autorizado aún (cargando), mostramos pantalla blanca o carga
  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="container mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}