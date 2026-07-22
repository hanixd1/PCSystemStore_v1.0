import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import AppShell from '@/components/AppShell';
import { getSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: 'PCSystemStore | Componentes y hardware para PC', template: '%s' },
  description: 'Componentes, laptops, periféricos y herramientas para configurar tu PC en PCSystemStore.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-csp-nonce') ?? undefined;
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body nonce={nonce} className="bg-gray-50 text-gray-900" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
