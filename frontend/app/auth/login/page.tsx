'use client';

import Link from 'next/link';
import { FiTruck, FiAward, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc'; // Icono de Google (instala react-icons si falta)
import { useState } from 'react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full flex flex-col md:flex-row gap-12 bg-white rounded-2xl shadow-sm overflow-hidden p-8 md:p-12">
        
        {/* LADO IZQUIERDO: Beneficios (Marketing) */}
        <div className="hidden md:flex flex-col justify-center w-1/2 pr-12 border-r border-gray-100">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-2xl font-black tracking-tighter text-gray-900">PC SYSTEM</span>
            <span className="text-xs font-bold bg-brand-cyan text-white px-2 py-0.5 rounded">ID</span>
          </div>
          
          <div className="mt-12 space-y-8">
            <div className="flex gap-4">
              <div className="p-3 bg-gray-50 rounded-xl h-fit">
                <FiTruck className="text-2xl text-gray-800" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Gestiona tus pedidos</h3>
                <p className="text-gray-500 text-sm mt-1">Ten el control de todos tus pedidos y recibe notificaciones con el seguimiento en tiempo real.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-3 bg-gray-50 rounded-xl h-fit">
                <FiAward className="text-2xl text-gray-800" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Lista de deseos personalizada</h3>
                <p className="text-gray-500 text-sm mt-1">Guarda tus productos favoritos para armar tu PC cuando estés listo.</p>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Formulario */}
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <h2 className="text-3xl font-black text-gray-900 mb-8">Iniciar sesión</h2>
          
          {/* Botón Google */}
          <button className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg transition mb-6">
            <FcGoogle className="text-2xl" />
            Acceder con Google
          </button>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">O bien</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form className="space-y-5">
            <div>
              <input 
                type="email" 
                placeholder="E-mail*" 
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition text-gray-900 placeholder-gray-400"
              />
            </div>
            
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña*" 
                className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition text-gray-900 placeholder-gray-400"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
               <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                 <input type="checkbox" className="rounded border-gray-300 text-brand-cyan focus:ring-brand-cyan" />
                 No soy un robot
               </label>
               <Link href="#" className="text-brand-cyan font-bold hover:underline decoration-2">
                 He olvidado mi contraseña
               </Link>
            </div>

            <button className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-orange-200 transition text-lg mt-4">
              Iniciar sesión
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-600 font-bold mb-4">¿Eres nuevo cliente?</p>
            <button className="w-full bg-white border-2 border-gray-200 hover:border-gray-800 text-gray-900 font-bold py-3 rounded-lg transition">
              Crear cuenta
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}