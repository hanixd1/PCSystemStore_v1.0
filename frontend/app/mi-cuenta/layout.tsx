import type { Metadata } from 'next';
import AccountLayoutClient from '@/components/AccountLayoutClient';
import { privateMetadata } from '@/lib/seo';

export const metadata: Metadata = privateMetadata();
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
