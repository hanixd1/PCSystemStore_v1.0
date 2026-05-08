'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const Chatbot = dynamic(() => import('@/components/Chatbot'), {
  ssr: false,
});

export default function ClientChatbot() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <Chatbot />;
}
