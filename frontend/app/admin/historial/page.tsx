'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { FiActivity, FiBox, FiClock, FiShield, FiUser } from 'react-icons/fi';

type AuditScope = 'security' | 'products';

type AuditLog = {
  id: string;
  action: string;
  module?: string | null;
  entity?: string;
  entityType?: string | null;
  entityName?: string | null;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  details: string;
  createdAt: string;
  user?: {
    name: string;
    role: string;
    email?: string;
  };
};

const tabs: Array<{ key: AuditScope; label: string; icon: React.ReactNode }> = [
  { key: 'security', label: 'Seguridad y administración', icon: <FiShield /> },
  { key: 'products', label: 'Productos e inventario', icon: <FiBox /> },
];

function getBadge(action: string) {
  if (action.includes('LOGIN')) return 'bg-blue-50 text-blue-700 border-blue-100';
  if (action.includes('STOCK') || action.includes('SALE'))
    return 'bg-amber-50 text-amber-700 border-amber-100';
  if (action.includes('PRICE')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (action.includes('IMAGE')) return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  if (action.includes('DELETE') || action.includes('REJECT'))
    return 'bg-red-50 text-red-700 border-red-100';
  if (action.includes('CREATE') || action.includes('APPROVED'))
    return 'bg-green-50 text-green-700 border-green-100';
  return 'bg-gray-50 text-gray-700 border-gray-100';
}

function getActionLabel(action: string) {
  return action.replace(/_/g, ' ');
}

export default function HistorialPage() {
  const [activeTab, setActiveTab] = useState<AuditScope>('security');
  const [securityLogs, setSecurityLogs] = useState<AuditLog[]>([]);
  const [productLogs, setProductLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadLogs = async () => {
      try {
        const [securityRes, productsRes] = await Promise.all([
          api.get('/admin/audit/security?limit=100'),
          api.get('/admin/audit/products?limit=100'),
        ]);

        if (mounted) {
          setSecurityLogs(securityRes.data);
          setProductLogs(productsRes.data);
        }
      } catch (error) {
        if (mounted) {
          setError(getApiErrorMessage(error, 'No se pudo cargar el historial de auditoría.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleLogs = useMemo(() => {
    const source = activeTab === 'security' ? securityLogs : productLogs;
    if (!actionFilter) return source;
    return source.filter((log) => log.action === actionFilter);
  }, [activeTab, actionFilter, productLogs, securityLogs]);

  const actionOptions = useMemo(() => {
    const source = activeTab === 'security' ? securityLogs : productLogs;
    return Array.from(new Set(source.map((log) => log.action))).sort((a, b) => a.localeCompare(b));
  }, [activeTab, productLogs, securityLogs]);

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-xl bg-black p-3 text-white shadow-lg">
          <FiActivity size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-800">Historial de Auditoría</h1>
          <p className="font-medium text-gray-500">
            Monitorea cambios administrativos, productos, inventario y ventas
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 lg:flex-row lg:items-end">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setActionFilter('');
                }}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition',
                  activeTab === tab.key
                    ? 'bg-brand-cyan text-gray-900'
                    : 'bg-gray-50 text-gray-500 hover:bg-cyan-50 hover:text-brand-cyan',
                ].join(' ')}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <label className="min-w-[240px]">
            <span className="mb-2 block text-xs font-black uppercase text-gray-500">
              Tipo de acción
            </span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 outline-none focus:border-brand-cyan"
            >
              <option value="">Todas</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className="p-10 text-center font-bold text-gray-500">Cargando registros...</p>
        ) : error ? (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
        ) : visibleLogs.length === 0 ? (
          <p className="p-10 text-center font-bold text-gray-500">
            No hay eventos registrados en esta categoría.
          </p>
        ) : activeTab === 'security' ? (
          <SecurityTable logs={visibleLogs} />
        ) : (
          <ProductsTable logs={visibleLogs} />
        )}
      </div>
    </div>
  );
}

function SecurityTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
      <div className="hidden grid-cols-[1fr_1fr_0.8fr_1fr_2fr] bg-gray-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white lg:grid">
        <span>Fecha/hora</span>
        <span>Usuario responsable</span>
        <span>Rol</span>
        <span>Acción</span>
        <span>Descripción</span>
      </div>
      <div className="divide-y divide-gray-100">
        {logs.map((log) => (
          <div
            key={log.id}
            className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1fr_1fr_0.8fr_1fr_2fr]"
          >
            <DateCell value={log.createdAt} />
            <ActorCell log={log} />
            <span className="font-bold text-gray-500">{log.user?.role || '-'}</span>
            <ActionBadge action={log.action} />
            <p className="text-gray-600">{log.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100">
      <div className="min-w-[1100px]">
        <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr_0.9fr_1fr_1fr_0.8fr_0.8fr_2fr] bg-gray-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white">
          <span>Fecha/hora</span>
          <span>Responsable</span>
          <span>Acción</span>
          <span>Producto/Entidad</span>
          <span>Campo</span>
          <span>Valor anterior</span>
          <span>Valor nuevo</span>
          <span>Stock antes</span>
          <span>Stock después</span>
          <span>Descripción</span>
        </div>
        <div className="divide-y divide-gray-100">
          {logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[1fr_1fr_1fr_1.2fr_0.9fr_1fr_1fr_0.8fr_0.8fr_2fr] gap-3 px-4 py-4 text-sm"
            >
              <DateCell value={log.createdAt} />
              <ActorCell log={log} />
              <ActionBadge action={log.action} />
              <span className="font-bold text-gray-800">
                {log.entityName || log.entityType || '-'}
              </span>
              <span className="text-gray-500">{log.fieldName || '-'}</span>
              <span className="truncate text-gray-500" title={log.oldValue || ''}>
                {log.oldValue || '-'}
              </span>
              <span className="truncate text-gray-500" title={log.newValue || ''}>
                {log.newValue || '-'}
              </span>
              <span className="font-bold text-gray-600">{log.stockBefore ?? '-'}</span>
              <span className="font-bold text-gray-600">{log.stockAfter ?? '-'}</span>
              <p className="text-gray-600">{log.details}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DateCell({ value }: { value: string }) {
  return (
    <span className="flex items-center gap-1 font-bold text-gray-500">
      <FiClock />
      {new Date(value).toLocaleString()}
    </span>
  );
}

function ActorCell({ log }: { log: AuditLog }) {
  return (
    <span className="flex items-center gap-2 font-bold text-gray-800">
      <FiUser className="text-gray-400" />
      {log.user?.name || 'Sistema'}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`w-max rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getBadge(action)}`}
    >
      {getActionLabel(action)}
    </span>
  );
}
