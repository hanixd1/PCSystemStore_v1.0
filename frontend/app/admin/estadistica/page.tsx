'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiBarChart2,
  FiBox,
  FiRefreshCw,
  FiTrendingUp,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';

type InventoryStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'BREAK_RISK';
type AiMode = 'AI_SERVICE' | 'LOCAL_FALLBACK';

type DashboardError = {
  message: string;
  detail: string;
  suggestion?: string;
};

type InventoryDashboard = {
  summary: {
    totalProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    riskProducts: number;
    estimatedInventoryValue: number;
  };
  alerts: Array<{
    productId: string;
    name: string;
    category: string;
    stock: number;
    status: InventoryStatus;
    risk: number;
    recommendation: string;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
  }>;
  aiStatus: {
    available: boolean;
    mode: AiMode;
    lastUpdated: string;
  };
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  NORMAL: 'Stock normal',
  LOW_STOCK: 'Stock bajo',
  OUT_OF_STOCK: 'Sin stock',
  BREAK_RISK: 'Riesgo de quiebre',
};

const STATUS_STYLES: Record<InventoryStatus, string> = {
  NORMAL: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LOW_STOCK: 'border-amber-200 bg-amber-50 text-amber-700',
  OUT_OF_STOCK: 'border-red-200 bg-red-50 text-red-700',
  BREAK_RISK: 'border-orange-200 bg-orange-50 text-orange-700',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) {
    return 'Sin actualizar';
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getTechnicalErrorDetail(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      return responseMessage.join(' ');
    }

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Error desconocido al consultar el backend.';
}

export default function EstadisticaPage() {
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<DashboardError | null>(null);

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await api.get<InventoryDashboard>('/statistics/inventory-dashboard');
      setDashboard(response.data);
    } catch (requestError) {
      const detail = getTechnicalErrorDetail(requestError);
      setError({
        message: getApiErrorMessage(requestError, 'No se pudo cargar el análisis de inventario.'),
        detail,
        suggestion: detail.includes('Cannot GET /statistics/inventory-dashboard')
          ? 'Revisa que el backend activo tenga registrado StatisticsModule y que se haya reiniciado después del cambio.'
          : undefined,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const summaryCards = dashboard
    ? [
        {
          label: 'Total de productos',
          value: dashboard.summary.totalProducts,
          icon: FiBox,
        },
        {
          label: 'Productos sin stock',
          value: dashboard.summary.outOfStockProducts,
          icon: FiAlertCircle,
        },
        {
          label: 'Stock bajo',
          value: dashboard.summary.lowStockProducts,
          icon: FiTrendingUp,
        },
        {
          label: 'Productos en riesgo',
          value: dashboard.summary.riskProducts,
          icon: FiAlertCircle,
        },
        {
          label: 'Valor estimado',
          value: formatCurrency(dashboard.summary.estimatedInventoryValue),
          icon: FiBarChart2,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-black p-3 text-white shadow-lg">
            <FiBarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800">Estadística</h1>
            <p className="font-medium text-gray-500">
              Análisis de inventario, alertas de stock y recomendaciones de reposición.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchDashboard(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
          Actualizar análisis
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white/70 p-10 text-center">
          <p className="text-sm font-bold text-gray-500">Cargando análisis de inventario...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="font-bold text-red-700">No se pudo cargar el análisis de inventario.</p>
          <p className="mt-1 text-sm text-red-600">{error.message}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-red-500">
            Detalle técnico
          </p>
          <p className="mt-1 text-sm text-red-600">{error.detail}</p>
          {error.suggestion ? (
            <p className="mt-3 rounded-md border border-red-200 bg-white/70 p-3 text-sm text-red-700">
              {error.suggestion}
            </p>
          ) : null}
        </div>
      ) : !dashboard ? (
        <div className="rounded-lg border border-gray-200 bg-white/70 p-10 text-center">
          <p className="text-sm font-bold text-gray-500">No hay datos para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-gray-200 bg-white/80 p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                    {card.label}
                  </p>
                  <card.icon className="text-gray-400" size={20} />
                </div>
                <p className="text-2xl font-black text-gray-900">{card.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white/80 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-800">Alertas de stock</h2>
                <p className="text-sm text-gray-500">
                  Análisis local operativo basado en stock actual y umbrales configurados.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                {dashboard.alerts.length} alertas
              </span>
            </div>

            {dashboard.alerts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-gray-500">
                  No hay productos con stock critico en este momento.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-4">Producto</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4">Stock actual</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Riesgo</th>
                      <th className="p-4">Recomendación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboard.alerts.map((alert) => (
                      <tr key={alert.productId} className="hover:bg-gray-50">
                        <td className="max-w-sm p-4 font-bold text-gray-800">{alert.name}</td>
                        <td className="p-4 text-gray-600">{alert.category}</td>
                        <td className="p-4 font-black text-gray-900">{alert.stock}</td>
                        <td className="p-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-3 py-1 text-xs font-bold',
                              STATUS_STYLES[alert.status],
                            ].join(' ')}
                          >
                            {STATUS_LABELS[alert.status]}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex min-w-28 items-center gap-3">
                            <div className="h-2 flex-1 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-gray-900"
                                style={{ width: `${Math.min(alert.risk, 100)}%` }}
                              />
                            </div>
                            <span className="w-9 text-right font-bold text-gray-700">
                              {alert.risk}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{alert.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-gray-200 bg-white/80 p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-black text-gray-800">Recomendaciones</h2>
              <div className="space-y-3">
                {dashboard.recommendations.map((recommendation, index) => (
                  <div
                    key={`${recommendation.type}-${index}`}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                      {recommendation.type}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {recommendation.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-800">Estado del motor IA</h2>
                {dashboard.aiStatus.available ? (
                  <FiWifi className="text-emerald-600" size={22} />
                ) : (
                  <FiWifiOff className="text-amber-600" size={22} />
                )}
              </div>

              <div
                className={[
                  'rounded-lg border p-4',
                  dashboard.aiStatus.available
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50',
                ].join(' ')}
              >
                <p className="font-black text-gray-800">
                  {dashboard.aiStatus.available
                    ? 'IA conectada'
                    : 'IA no disponible, usando análisis local'}
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-600">
                  Modo: {dashboard.aiStatus.mode}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Última actualización: {formatDate(dashboard.aiStatus.lastUpdated)}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
