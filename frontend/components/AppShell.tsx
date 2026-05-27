'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import CartSidebar from '@/components/CartSidebar';
import ClientChatbot from '@/components/ClientChatbot';
import CartHydrator from '@/components/CartHydrator';
import PublicFooter from '@/components/PublicFooter';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <CartHydrator />
      <Header />
      <CartSidebar />
      <main className="min-h-[calc(100vh-80px)]">{children}</main>
      <PublicFooter />
      <ClientChatbot />
    </>
  );
}
