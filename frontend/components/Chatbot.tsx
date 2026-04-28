'use client';

import { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import { api } from '@/lib/api';

type ChatMessage = {
  id: string;
  text: string;
  role: 'user' | 'assistant';
};

const STARTER_PROMPTS = [
  'Tengo 3000 soles y quiero una PC para jugar',
  'Busco una PC para oficina con monitor',
  'Quiero una PC para estudio, solo torre',
  'Tienes alguna RTX para gaming?',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageSequenceRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Hola, soy tu asistente de PCSystemStore. Si quieres, te ayudo a encontrar una pieza puntual o a armar una PC segun tu presupuesto y uso.',
      role: 'assistant',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const nextMessageId = (prefix: 'user' | 'assistant') => {
    const id = `${prefix}-${messageSequenceRef.current}`;
    messageSequenceRef.current += 1;
    return id;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: nextMessageId('user'),
      text: trimmed,
      role: 'user',
    };

    const historyForBackend = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: trimmed,
        history: historyForBackend,
      });

      const botMessage: ChatMessage = {
        id: nextMessageId('assistant'),
        text:
          typeof res.data?.reply === 'string'
            ? res.data.reply
            : 'No pude procesar bien tu pedido. Intentemos con otra forma de decirlo.',
        role: 'assistant',
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId('assistant'),
          text: 'Se corto la conexion con el asistente. Intentalo de nuevo en un momento.',
          role: 'assistant',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] bg-brand-cyan text-gray-900 p-4 rounded-full shadow-2xl shadow-brand-cyan/40 hover:bg-cyan-400 hover:scale-110 transition-all duration-300 flex items-center justify-center"
        >
          <FiMessageSquare size={28} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[100] w-[350px] sm:w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-fade-in-up"
          style={{ height: '580px', maxHeight: '85vh' }}
        >
          <div className="bg-[#1a1f2b] text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="bg-brand-cyan text-gray-900 p-2 rounded-full">
                <FiCpu size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">Asistente de Compra IA</h3>
                <p className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  En linea
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            <p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest my-2">
              Hoy
            </p>

            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Prueba con algo como:
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="text-left text-xs px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-gray-900 transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 text-sm shadow-sm whitespace-pre-line ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                      : 'bg-brand-cyan text-gray-900 font-medium rounded-2xl rounded-tr-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  ></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                className="flex-1 border-2 border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:border-brand-cyan transition-colors"
                placeholder="Ej: tengo 3000 soles y quiero una PC gamer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 bg-[#1a1f2b] text-white px-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                <FiSend size={18} />
              </button>
            </form>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              La recomendacion se basa en el catalogo y stock actual. Verifica el carrito antes de pagar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
