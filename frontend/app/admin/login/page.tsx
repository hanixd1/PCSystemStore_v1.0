'use client';

import { FormEvent, useState } from 'react';
import { FiLock, FiUser } from 'react-icons/fi';
import { api, AUTHORIZED_ADMIN_ROLES, getApiErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/users/admin-login', formData);

      if (!AUTHORIZED_ADMIN_ROLES.has(res.data.user.role)) {
        throw new Error('Esta cuenta no tiene permisos administrativos.');
      }

      localStorage.removeItem('customerUser');
      localStorage.removeItem('customerToken');
      localStorage.setItem('adminUser', JSON.stringify(res.data.user));
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);
      window.location.href = '/admin';
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Correo o contrasena incorrectos'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-gray-800">
            ADMIN <span className="text-brand-cyan">PANEL</span>
          </h1>
          <p className="mt-2 text-gray-500">Inicia sesion para gestionar la tienda</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-center text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Correo electronico</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-3 text-lg text-gray-400" />
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-cyan"
                placeholder="ingresar correo"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Contrasena</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-lg text-gray-400" />
              <input
                type="password"
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-cyan"
                placeholder="ingresar contrasena"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="mb-4 text-right">
            <a href="/admin/forgot-password" className="text-sm text-brand-cyan hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-black py-3 font-bold text-white shadow-lg transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Validando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
