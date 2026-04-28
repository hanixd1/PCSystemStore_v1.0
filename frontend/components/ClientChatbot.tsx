'use client';

import dynamic from 'next/dynamic';

const Chatbot = dynamic(() => import('@/components/Chatbot'), {
  ssr: false,
});

export default function ClientChatbot() {
  return <Chatbot />;
}
