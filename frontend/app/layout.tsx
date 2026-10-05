import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import AppShell from '@/components/AppShell';
import RuntimeMaintenance from '@/components/RuntimeMaintenance';
import { APP_VERSION, COMMIT_SHA } from '@/lib/build-info';
import { getSiteUrl } from '@/lib/site-url';

const siteUrl = getSiteUrl();
const description =
  'Componentes, laptops, periféricos y herramientas para configurar tu PC en PCSystemStore.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'PCSystemStore | Componentes y hardware para PC', template: '%s' },
  description,
  openGraph: {
    title: 'PCSystemStore | Componentes y hardware para PC',
    description,
    siteName: 'PCSystemStore',
    type: 'website',
  },
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
    <html
      lang="es"
      data-scroll-behavior="smooth"
      data-app-version={APP_VERSION}
      data-commit-sha={COMMIT_SHA}
    >
      <body nonce={nonce} className="bg-gray-50 text-gray-900" suppressHydrationWarning>
        <RuntimeMaintenance />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
