'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiAward, FiBarChart2, FiBox, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { ForecastPanel } from '@/features/statistics/ForecastPanel';
import { InventoryPanel } from '@/features/statistics/InventoryPanel';
import { ResearchPanel } from '@/features/statistics/ResearchPanel';

type AccessState = 'checking' | 'allowed' | 'denied';
type TabKey = 'forecast' | 'inventory' | 'research';

type SessionUser = {
  role?: string;
};

const TABS: Array<{ key: TabKey; label: string; description: string; icon: IconType }> = [
  {
    key: 'forecast',
    label: 'Pronóstico de ventas',
    description: 'Unidades esperadas y probabilidades por mes.',
    icon: FiTrendingUp,
  },
  {
    key: 'inventory',
    label: 'Inventario',
    description: 'Alertas de stock y riesgo de quiebre.',
    icon: FiBox,
  },
  {
    key: 'research',
    label: 'Resultados del modelo',
    description: 'Comparación de modelos de la tesis.',
    icon: FiAward,
  },
];

function readAdminRole() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const rawUser = localStorage.getItem('adminUser') || localStorage.getItem('user');
    if (!rawUser) return '';
    const parsed = JSON.parse(rawUser) as SessionUser;
    return parsed.role || '';
  } catch {
    return '';
  }
}

export default function EstadisticaPage() {
  const [access, setAccess] = useState<AccessState>('checking');
  const [tab, setTab] = useState<TabKey>('forecast');
  // A tab is mounted on its first visit and then only hidden, so switching back keeps its data
  // instead of querying the forecast again.
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set(['forecast']));
  const [refreshKey, setRefreshKey] = useState(0);

  const selectTab = (key: TabKey) => {
    setTab(key);
    setVisited((current) => (current.has(key) ? current : new Set(current).add(key)));
  };

  useEffect(() => {
    setAccess(readAdminRole() === 'ADMIN' ? 'allowed' : 'denied');
  }, []);

  if (access === 'checking') {
    return (
      <div className="mx-auto max-w-7xl pb-20">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-10 text-center">
          <p className="text-sm font-bold text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="mx-auto max-w-7xl pb-20">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-black text-red-700">Acceso denegado</h1>
          <p className="mt-2 text-sm font-semibold text-red-600">
            No tienes permisos para acceder al módulo de Estadística.
          </p>
          <Link
            prefetch={false}
            href="/admin"
            className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-black p-3 text-white">
            <FiBarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800">Estadística</h1>
            <p className="font-medium text-gray-500">
              Pronóstico de demanda, alertas de stock y resultados del sistema de pronóstico.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
        >
          <FiRefreshCw />
          Actualizar análisis
        </button>
      </div>

      <nav className="mb-8 grid gap-3 md:grid-cols-3" aria-label="Secciones de estadística">
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectTab(item.key)}
              aria-pressed={active}
              className={[
                'flex items-center gap-3 rounded-lg border p-4 text-left transition',
                active
                  ? 'border-cyan-300 bg-brand-cyan text-gray-900 shadow-sm'
                  : 'border-slate-200 bg-slate-50/80 text-gray-700 hover:border-cyan-200 hover:bg-cyan-50/60',
              ].join(' ')}
            >
              <item.icon size={22} className={active ? 'text-gray-900' : 'text-gray-400'} />
              <span>
                <span className="block text-sm font-black">{item.label}</span>
                <span
                  className={[
                    'block text-xs font-semibold',
                    active ? 'text-gray-800' : 'text-gray-500',
                  ].join(' ')}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {visited.has('forecast') ? (
        <div hidden={tab !== 'forecast'}>
          <ForecastPanel key={refreshKey} />
        </div>
      ) : null}
      {visited.has('inventory') ? (
        <div hidden={tab !== 'inventory'}>
          <InventoryPanel refreshKey={refreshKey} />
        </div>
      ) : null}
      {visited.has('research') ? (
        <div hidden={tab !== 'research'}>
          <ResearchPanel key={refreshKey} />
        </div>
      ) : null}
    </div>
  );
}
