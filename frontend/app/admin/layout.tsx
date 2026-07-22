import type { Metadata } from 'next';
import AdminLayoutClient from '@/components/AdminLayoutClient';
import { privateMetadata } from '@/lib/seo';

export const metadata: Metadata = privateMetadata();
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
