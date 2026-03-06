// frontend/components/Header.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image'; // <--- IMPORTANTE: Importar Image
import { useState } from 'react';
import { FiMenu, FiSearch, FiUser, FiShoppingCart } from 'react-icons/fi';
import MegaMenu from './MegaMenu';
import { useCartStore } from '../store/useCartStore';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openCart, items } = useCartStore();

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-40 font-sans shadow-sm">
        {/* Barra superior negra */}
        <div className="bg-black text-white text-[10px] md:text-xs py-2 text-center hidden md:block tracking-wide font-bold">
          🚀 Envíos gratis a todo Huancayo por compras mayores a S/. 500
        </div>

        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4 md:gap-8">
          
          {/* IZQUIERDA: Logo y Menú */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* 3. LOGO CON IMAGEN (Reemplaza el texto anterior) */}
            <Link href="/" className="flex-shrink-0">
              {/* REEMPLAZA '/logo-placeholder.png' CON LA RUTA REAL DE TU LOGO EN 'public' */}
              <div className="w-40 h-12 relative flex items-center bg-gray-100 rounded">
                 {/* <Image src="/tu-logo.png" alt="PC System Store" fill className="object-contain" priority /> */}
                 <span className="text-xs text-gray-400 mx-auto font-bold">[LOGO AQUÍ]</span>
              </div>
            </Link>

            {/* 4. BOTÓN MENÚ (Color oscuro llamativo) */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="hidden md:flex items-center gap-3 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full transition-all duration-200 text-sm font-bold shadow-md hover:shadow-cyan-400/50 ring-1 ring-cyan-400/30 transform hover:-translate-y-0.5"
            >
              <FiMenu className="text-xl" />
              <span>Menú</span>
            </button>
          </div>

          {/* CENTRO: Buscador */}
          <div className="flex-1 max-w-2xl hidden md:block px-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Buscar componentes, periféricos..."
                // Hice el borde cyan al enfocar más notorio
                className="w-full bg-gray-100 focus:bg-white border-2 border-transparent focus:border-brand-cyan rounded-xl py-3 pl-5 pr-16 outline-none transition-all text-gray-900 placeholder-gray-500 font-medium"
              />
              {/* 1. BOTÓN BUSCAR (Más grande, cyan intenso y negrita) */}
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-400 transition-all duration-200 shadow-md hover:shadow-cyan-400/50 ring-1 ring-cyan-400/30 flex items-center justify-center">
                <FiSearch className="text-xl stroke-2" /> {/* stroke-2 hace el icono más grueso */}
              </button>
            </div>
          </div>

          {/* DERECHA: Usuario y Carrito */}
          <div className="flex items-center gap-2 md:gap-6">
            
            {/* 2. MI CUENTA (Unido, hover cyan, clic en todo) */}
            <Link 
              href="/auth/login" 
              className="flex flex-col items-center justify-center text-gray-600 hover:text-brand-cyan transition group p-2"
            >
              <FiUser className="text-[28px] group-hover:scale-110 transition-transform" /> {/* Icono un poco más grande */}
              {/* Quité el margen mb-1 para juntarlos */}
              <span className="text-[10px] font-bold uppercase hidden md:block mt-1">Mi Cuenta</span>
            </Link>

            {/* Carrito (Ya estaba bien, solo ajusté tamaños para igualar) */}
            <button 
              onClick={openCart} 
              className="flex flex-col items-center justify-center text-gray-600 hover:text-brand-cyan transition relative group p-2"
            >
              <div className="relative">
                <FiShoppingCart className="text-[28px] group-hover:scale-110 transition-transform" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {items.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase hidden md:block mt-1">Mi Cesta</span>
            </button>
          </div>
          
          {/* Menú Móvil */}
          <button onClick={() => setIsMenuOpen(true)} className="md:hidden text-3xl text-gray-700 p-2">
            <FiMenu />
          </button>
        </div>
      </header>

      <MegaMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

export default Header;