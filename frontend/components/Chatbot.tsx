'use client';

import { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import axios from 'axios';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mensaje inicial de bienvenida
  const [messages, setMessages] = useState([
    { 
      text: '¡Hola! 👋 Soy el Asistente Experto en Hardware de PCSystemStore. ¿Estás armando una PC o buscas algún componente en específico?', 
      isBot: true 
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Truco para que el chat haga scroll hacia abajo automáticamente cuando hay nuevos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para enviar el mensaje
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    // Agregamos el mensaje del usuario a la pantalla
    setMessages(prev => [...prev, { text: userText, isBot: false }]);
    setInput('');
    setIsLoading(true);

    try {
      // AQUÍ LLAMAMOS A NUESTRO BACKEND REAL CON PYTHON
      const res = await axios.post('http://localhost:3000/ai/chat', { message: userText });
      
      setMessages(prev => [...prev, { text: res.data.reply, isBot: true }]);
      setIsLoading(false);

    } catch (error) {
      setMessages(prev => [...prev, { text: 'Ups, tuve un corto circuito. 🤖 ¿Puedes intentarlo de nuevo?', isBot: true }]);
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 1. EL GLOBITO FLOTANTE (Se oculta si el chat está abierto) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] bg-brand-cyan text-gray-900 p-4 rounded-full shadow-2xl shadow-brand-cyan/40 hover:bg-cyan-400 hover:scale-110 transition-all duration-300 flex items-center justify-center"
        >
          <FiMessageSquare size={28} />
        </button>
      )}

      {/* 2. LA VENTANA DEL CHAT */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-[100] w-[350px] sm:w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-fade-in-up" 
          style={{ height: '550px', maxHeight: '85vh' }}
        >
          
          {/* HEADER DEL CHAT */}
          <div className="bg-[#1a1f2b] text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="bg-brand-cyan text-gray-900 p-2 rounded-full">
                <FiCpu size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">Asistente Experto IA</h3>
                <p className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> En línea
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <FiX size={24} />
            </button>
          </div>

          {/* CUERPO DE MENSAJES */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            <p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest my-2">Hoy</p>
            
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-3.5 text-sm shadow-sm ${
                  msg.isBot 
                    ? 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm' 
                    : 'bg-brand-cyan text-gray-900 font-medium rounded-2xl rounded-tr-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* ANIMACIÓN DE "ESCRIBIENDO..." */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ZONA DE ESCRITURA (INPUT) */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                className="flex-1 border-2 border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:border-brand-cyan transition-colors"
                placeholder="Pregunta por un producto..."
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
              La IA puede cometer errores. Verifica el carrito antes de pagar.
            </p>
          </div>

        </div>
      )}
    </>
  );
}