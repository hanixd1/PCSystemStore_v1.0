'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isAdminRoute } from '@/lib/adminRouting';

const Chatbot = dynamic(() => import('@/components/Chatbot'), {
  ssr: false,
});

export default function ClientChatbot() {
  const pathname = usePathname();

  if (isAdminRoute(pathname)) {
    return null;
  }

  return <Chatbot />;
}
