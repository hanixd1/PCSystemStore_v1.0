'use client';

import Link from 'next/link';
// 1. IMPORTAR usePathname
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { FiPlus, FiLogOut, FiMenu, FiGrid, FiChevronLeft, FiBox } from 'react-icons/fi';
import { api, clearStoredAuthSession } from '@/lib/api';

export default function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  // 2. DEFINIR LA VARIABLE pathname
  const pathname = usePathname();

  const handleLogout = async () => {
    await api.post('/users/admin-logout').catch(() => undefined);
    clearStoredAuthSession();
    router.push('/admin/login');
  };

  const menuItems = [
    { name: 'Panel Principal', icon: FiGrid, href: '/admin' },
    { name: 'Inventario', icon: FiBox, href: '/admin/inventario' },
    { name: 'Agregar Producto', icon: FiPlus, href: '/admin/add-product' },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-gray-900 text-white min-h-screen transition-all duration-300 ease-in-out flex flex-col border-r border-gray-800 sticky top-0 h-screen`}
    >
      <div className="h-20 flex items-center justify-between px-4 border-b border-gray-800">
        {!isCollapsed && (
          <span className="text-xl font-black tracking-tighter text-white animate-fade-in">
            ADMIN<span className="text-brand-cyan">PANEL</span>
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
        >
          {isCollapsed ? <FiMenu size={24} /> : <FiChevronLeft size={24} />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/admin/inventario' && pathname?.startsWith('/admin/edit-product'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-brand-cyan text-gray-900 font-bold shadow-lg shadow-brand-cyan/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div
                className={`${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-white'}`}
              >
                <item.icon size={22} />
              </div>

              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                }`}
              >
                {item.name}
              </span>

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition ${isCollapsed ? 'justify-center' : ''}`}
        >
          <FiLogOut size={22} />
          {!isCollapsed && <span className="font-bold">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
