'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [pass, setPass] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await axios.post('https://pcsystemstore.onrender.com', { token, newPassword: pass });
      alert('✅ Contraseña cambiada. Ahora inicia sesión.');
      router.push('/admin/login');
    } catch (error) {
      alert('❌ El token es inválido o expiró.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Nueva Contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password" 
            placeholder="Escribe tu nueva clave"
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setPass(e.target.value)}
          />
          <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-bold">Cambiar Contraseña</button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetForm />
    </Suspense>
  );
}