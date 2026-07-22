import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata(
  'Configura tu PC | PCSystemStore',
  'Selecciona componentes y revisa su compatibilidad con el configurador de PCSystemStore.',
  '/armar-pc',
);

export default function PcBuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
