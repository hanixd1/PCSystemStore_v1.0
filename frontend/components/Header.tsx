'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiMenu, FiPackage, FiSearch, FiShoppingCart, FiUser } from 'react-icons/fi';
import MegaMenu from './MegaMenu';
import { useCartStore } from '../store/useCartStore';
import { clearCustomerSession, useCustomerSession } from '@/lib/customerSession';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/product-images';

const Header = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [branding, setBranding] = useState({
    storeName: 'PCSystemStore',
    logoUrl: '',
    logoAlt: 'PCSystemStore',
  });
  const [logoFailed, setLogoFailed] = useState(false);
  const { customer } = useCustomerSession();
  const { openCart, items } = useCartStore();
  const accountRef = useRef<HTMLDivElement | null>(null);
  const logoUrl = resolveImageUrl(branding.logoUrl, { fallback: null });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBranding = async () => {
      try {
        const res = await api.get('/public/branding');
        if (mounted) {
          setBranding({
            storeName: res.data.storeName || 'PCSystemStore',
            logoUrl: res.data.logoUrl || '',
            logoAlt: res.data.logoAlt || res.data.storeName || 'PCSystemStore',
          });
          setLogoFailed(false);
        }
      } catch (error) {
        console.error('Error cargando marca publica:', error);
      }
    };

    void loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedTerm = searchTerm.replace(/\s+/g, ' ').trim();
    if (!normalizedTerm) {
      return;
    }

    router.push(
      `/categoria/${encodeURIComponent(normalizedTerm)}?search=${encodeURIComponent(normalizedTerm)}`,
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white font-sans">
        <div className="hidden bg-black py-2 text-center text-[10px] font-bold tracking-wide text-white md:block md:text-xs">
          Envios a todo el Peru
        </div>

        <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 md:gap-8">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="shrink-0">
              <div className="relative flex h-16 w-[150px] items-center justify-start overflow-hidden md:w-[190px]">
                {logoUrl && !logoFailed ? (
                  <img
                    src={logoUrl}
                    alt={branding.logoAlt}
                    onError={() => setLogoFailed(true)}
                    className="max-h-[64px] max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xl font-black tracking-tight text-gray-900">
                    {branding.storeName || '[LOGO AQUI]'}
                  </span>
                )}
              </div>
            </Link>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="hidden items-center gap-3 px-4 py-3 text-lg font-semibold text-gray-700 transition-colors hover:text-brand-cyan md:flex"
            >
              <FiMenu className="text-3xl" />
              <span>Menu</span>
            </button>
          </div>

          <div className="hidden max-w-2xl flex-1 px-4 md:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar componentes, perifericos..."
                className="h-11 w-full rounded-sm border border-gray-300 bg-white px-4 pr-12 text-sm font-medium text-gray-900 outline-none transition-colors placeholder-gray-500 focus:border-gray-600"
              />
              <button
                type="submit"
                aria-label="Buscar productos"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-900 transition-colors hover:text-brand-cyan"
              >
                <FiSearch className="text-xl stroke-2" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {customer ? (
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen((current) => !current);
                  }}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="menu"
                  className="group flex items-center gap-2 p-2 text-gray-600 transition hover:text-brand-cyan md:gap-3"
                >
                  <div className="hidden min-w-0 flex-col items-end leading-tight md:flex">
                    <span className="max-w-24 truncate text-sm font-black text-gray-700 transition group-hover:text-brand-cyan md:max-w-28">
                      {customer.name}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 transition group-hover:text-brand-cyan">
                      Mi cuenta
                    </span>
                  </div>
                  <FiUser className="text-[32px] transition-transform group-hover:scale-110 md:text-[36px]" />
                </button>

                {isAccountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-2xl shadow-gray-900/15"
                  >
                    <Link
                      href="/mi-cuenta/datos"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-cyan-50 hover:text-brand-cyan"
                    >
                      <FiUser /> Mis datos
                    </Link>
                    <Link
                      href="/mi-cuenta/pedidos"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-cyan-50 hover:text-brand-cyan"
                    >
                      <FiPackage /> Mis pedidos
                    </Link>
                    <Link
                      href="/mi-cuenta/direcciones"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-cyan-50 hover:text-brand-cyan"
                    >
                      <FiMapPin /> Mis direcciones
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false);
                        clearCustomerSession();
                        router.replace('/');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-cyan-50 hover:text-brand-cyan"
                    >
                      Cerrar sesion
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="group flex flex-col items-center justify-center p-2 text-gray-600 transition hover:text-brand-cyan"
              >
                <FiUser className="text-[28px] transition-transform group-hover:scale-110" />
                <span className="mt-1 hidden text-[10px] font-bold uppercase md:block">
                  Mi Cuenta
                </span>
              </Link>
            )}

            <button
              onClick={openCart}
              className="group relative flex flex-col items-center justify-center p-2 text-gray-600 transition hover:text-brand-cyan"
            >
              <div className="relative">
                <FiShoppingCart className="text-[28px] transition-transform group-hover:scale-110" />
                {items.length > 0 ? (
                  <span className="absolute -right-2 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 text-[10px] font-bold text-white">
                    {items.length}
                  </span>
                ) : null}
              </div>
              <span className="mt-1 hidden text-[10px] font-bold uppercase md:block">
                Mi Carrito
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-3xl text-gray-700 transition-colors hover:text-brand-cyan md:hidden"
          >
            <FiMenu />
          </button>
        </div>
      </header>

      <MegaMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

export default Header;
