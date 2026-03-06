'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FiLock, FiUser } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('https://pcsystemstore.onrender.com', formData);
      
      // Guardamos la "sesión" en el navegador
      localStorage.setItem('adminSession', JSON.stringify(res.data.user));
      
      router.push('/admin'); // Redirigir al panel
    } catch (err) {
      setError('Correo o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-800">ADMIN <span className="text-brand-cyan">PANEL</span></h1>
          <p className="text-gray-500 mt-2">Inicia sesión para gestionar la tienda</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-3 text-gray-400 text-lg" />
              <input 
                type="email" 
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-cyan outline-none"
                placeholder="ingresar correo"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-400 text-lg" />
              <input 
                type="password" 
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-cyan outline-none"
                placeholder="ingresar contraseña"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="text-right mb-4">
            <a href="/admin/forgot-password" className="text-sm text-brand-cyan hover:underline">
                ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}