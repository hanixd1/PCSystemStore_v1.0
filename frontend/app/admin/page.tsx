'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiCreditCard,
  FiGrid,
  FiImage,
  FiPlusSquare,
  FiUploadCloud,
  FiUsers,
} from 'react-icons/fi';

type SessionUser = {
  role?: string;
};

function readAdminRole() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const rawUser = localStorage.getItem('adminUser') || localStorage.getItem('user');
    if (!rawUser) {
      return '';
    }

    const parsed = JSON.parse(rawUser) as SessionUser;
    return parsed.role || '';
  } catch {
    return '';
  }
}

export default function AdminDashboardPage() {
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    setAdminRole(readAdminRole());
  }, []);

  const quickLinks = [
    {
      title: 'Inventario',
      description: 'Gestionar productos, precios, stock y edición.',
      href: '/admin/inventario',
      icon: FiGrid,
      roles: ['ADMIN', 'EDITOR'],
    },
    {
      title: 'Nuevo producto',
      description: 'Registrar un producto manualmente.',
      href: '/admin/add-product',
      icon: FiPlusSquare,
      roles: ['ADMIN', 'EDITOR'],
    },
    {
      title: 'Importar productos',
      description: 'Cargar productos desde Excel + ZIP.',
      href: '/admin/import-products',
      icon: FiUploadCloud,
      roles: ['ADMIN'],
    },
    {
      title: 'Estadística',
      description: 'Ver alertas de stock y análisis de inventario.',
      href: '/admin/estadistica',
      icon: FiBarChart2,
      roles: ['ADMIN'],
    },
    {
      title: 'Empleados',
      description: 'Gestionar accesos administrativos.',
      href: '/admin/empleados',
      icon: FiUsers,
      roles: ['ADMIN'],
    },
    {
      title: 'Banners y marca',
      description: 'Administrar la imagen visual del sitio.',
      href: '/admin/banners',
      icon: FiImage,
      roles: ['ADMIN'],
    },
    {
      title: 'Pagos',
      description: 'Revisar operaciones de pago.',
      href: '/admin/pagos',
      icon: FiCreditCard,
      roles: ['ADMIN'],
    },
    {
      title: 'Historial',
      description: 'Consultar actividad administrativa.',
      href: '/admin/historial',
      icon: FiActivity,
      roles: ['ADMIN'],
    },
  ].filter((link) => adminRole !== null && link.roles.includes(adminRole));

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-black p-3 text-white">
            <FiGrid size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Panel Administrativo</h1>
            <p className="font-medium text-gray-500">
              Resumen general y accesos rápidos del sistema.
            </p>
          </div>
        </div>
      </header>

      <section className="max-w-4xl border-l-4 border-brand-cyan pl-5">
        <h2 className="text-3xl font-black tracking-tight text-slate-950">
          Administra <span className="text-brand-cyan">PCSystemStore</span> desde módulos
          especializados.
        </h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Selecciona un módulo para administrar productos, inventario, empleados, estadísticas,
          pagos y configuración visual del sistema.
        </p>
      </section>

      <section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminRole === null ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5 text-sm font-bold text-slate-500">
              Cargando accesos disponibles...
            </div>
          ) : null}

          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-lg border border-slate-200 bg-slate-50/80 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-slate-100/80"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-lg bg-black p-3 text-white">
                  <item.icon size={20} />
                </div>
                <FiArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-500" />
              </div>
              <h2 className="text-lg font-black text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
