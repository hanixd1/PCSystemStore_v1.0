'use client';
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await axios.post('https://pcsystemstore.onrender.com', { email });
      setMessage('✅ Revisa la consola de tu Backend para ver el link.');
    } catch (error) {
      setMessage('❌ Error: Usuario no encontrado');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Recuperar Cuenta</h2>
        <p className="text-gray-500 mb-6">Ingresa tu correo para recibir el enlace.</p>
        
        {message && <p className="mb-4 font-bold text-blue-600">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            placeholder="admin@pcsystem.com"
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="w-full bg-brand-cyan py-3 rounded-lg font-bold">Enviar</button>
        </form>
        <Link href="/admin/login" className="block mt-4 text-sm text-gray-500">Volver al Login</Link>
      </div>
    </div>
  );
}