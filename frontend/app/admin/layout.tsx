'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiPlusSquare, FiUsers, FiActivity, FiLogOut } from 'react-icons/fi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const userStored = localStorage.getItem('user');
    if (userStored) {
      setCurrentUser(JSON.parse(userStored));
    }
  }, []);

  // 🛑 LA SOLUCIÓN AQUÍ: Usamos startsWith. 
  // Esto aniquila el sidebar en el login sin importar si la URL tiene una barra extra al final.
  if (pathname?.startsWith('/admin/login') || pathname?.startsWith('/admin/forgot-password')) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminSession');
    
    // El método nuclear para que el botón de salir funcione sí o sí
    window.location.href = '/admin/login'; 
  };

  if (!isMounted) return null;

  const displayUser = currentUser || { name: 'Cargando...', role: 'ADMIN' };

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-[#1a1f2b] text-white flex flex-col h-full flex-shrink-0 relative z-50">
        
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-black text-white tracking-tighter">
            ADMIN<span className="text-brand-cyan">PANEL</span>
          </h2>
        </div>

        <div className="p-6 border-b border-gray-800 bg-[#151923]">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Conectado como</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-cyan text-gray-900 flex items-center justify-center font-bold">
              {displayUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm">{displayUser.name}</p>
              <p className={`text-[10px] px-2 py-0.5 rounded-full w-max mt-1 font-bold ${
                displayUser.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {displayUser.role}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/admin' ? 'bg-brand-cyan text-gray-900 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <FiGrid size={20} /> Panel Principal
          </Link>
          <Link href="/admin/add-product" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/admin/add-product' ? 'bg-brand-cyan text-gray-900 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <FiPlusSquare size={20} /> Agregar Producto
          </Link>

          {/* GESTIÓN AVANZADA INTACTA */}
          {displayUser.role === 'ADMIN' && (
            <div className="pt-6 mt-4 border-t border-gray-800">
              <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Gestión Avanzada</p>
              <Link href="/admin/empleados" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/admin/empleados' ? 'bg-brand-cyan text-gray-900 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <FiUsers size={20} /> Empleados
              </Link>
              <Link href="/admin/historial" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/admin/historial' ? 'bg-brand-cyan text-gray-900 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <FiActivity size={20} /> Historial
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-800 mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
            <FiLogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {children}
      </main>
    </div>
  );
}