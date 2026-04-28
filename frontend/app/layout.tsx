import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import CartSidebar from '@/components/CartSidebar';
import ClientChatbot from '@/components/ClientChatbot';

export const metadata: Metadata = {
  title: 'PC System Store',
  description: 'Hardware & Gaming',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900" suppressHydrationWarning>
        <Header />
        <CartSidebar />
        <main className="min-h-[calc(100vh-80px)]">{children}</main>
        <ClientChatbot />
      </body>
    </html>
  );
}
