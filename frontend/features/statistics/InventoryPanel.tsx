'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiBarChart2,
  FiBox,
  FiCheck,
  FiEyeOff,
  FiRefreshCw,
  FiTrendingUp,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { ShareBar } from './charts';
import {
  MODEL_LABELS,
  RELIABILITY_INFO,
  RISK_STYLES,
  formatCurrency,
  formatDateTime,
  formatMonth,
  formatProbability,
  formatUnits,
  getTechnicalErrorDetail,
} from './format';
import { ErrorBox, LoadingBox, Panel, StatCard } from './ui';
import type { InventoryDashboard, InventoryStatus, StockAlertType } from './types';

type DashboardError = {
  message: string;
  detail: string;
  suggestion?: string;
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  NORMAL: 'Stock normal',
  LOW_STOCK: 'Stock bajo',
  OUT_OF_STOCK: 'Sin stock',
};

const STATUS_STYLES: Record<InventoryStatus, string> = {
  NORMAL: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LOW_STOCK: 'border-amber-200 bg-amber-50 text-amber-700',
  OUT_OF_STOCK: 'border-red-200 bg-red-50 text-red-700',
};

export function InventoryPanel({ refreshKey }: { refreshKey: number }) {
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardError | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard, refreshKey]);

  const handleAlertAction = async (
    productId: string,
    alertType: StockAlertType,
    action: 'REVIEWED' | 'DISMISSED',
  ) => {
    const actionKey = `${productId}:${alertType}:${action}`;
    setActionLoadingKey(actionKey);

    try {
      await api.post('/statistics/stock-alerts/action', {
        productId,
        alertType,
        action,
      });
      await fetchDashboard();
    } catch (requestError) {
      setError({
        message: getApiErrorMessage(requestError, 'No se pudo actualizar la alerta.'),
        detail: getTechnicalErrorDetail(requestError),
      });
    } finally {
      setActionLoadingKey('');
    }
  };

  if (loading && !dashboard) {
    return <LoadingBox text="Cargando análisis de inventario..." />;
  }

  if (error) {
    return <ErrorBox message={error.message} detail={error.detail} suggestion={error.suggestion} />;
  }

  if (!dashboard) {
    return <LoadingBox text="No hay datos para mostrar." />;
  }

  const forecastRisk = dashboard.forecastRisk;
  const riskAvailable = dashboard.summary.riskAvailable === true && forecastRisk !== null;

  return (
    <div className={['space-y-8 transition', loading ? 'opacity-60' : ''].join(' ')}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total de productos"
          value={dashboard.summary.totalProducts}
          description="Productos registrados en inventario."
          icon={FiBox}
        />
        <StatCard
          label="Productos sin stock"
          value={dashboard.summary.outOfStockProducts}
          description="Productos con stock igual a 0."
          icon={FiAlertCircle}
        />
        <StatCard
          label="Stock bajo"
          value={dashboard.summary.lowStockProducts}
          description="Productos con stock menor o igual al umbral configurado."
          icon={FiTrendingUp}
        />
        <StatCard
          label="Riesgo predictivo"
          value={riskAvailable ? dashboard.summary.riskCategories : 'N/D'}
          description={
            riskAvailable
              ? `Categorías con probabilidad alta de quiebre en ${formatMonth(forecastRisk.month)}.`
              : 'Requiere el sistema de pronóstico del ai-service.'
          }
          icon={FiAlertCircle}
        />
        <StatCard
          label="Valor estimado"
          value={formatCurrency(dashboard.summary.estimatedInventoryValue)}
          description="Valor referencial del stock actual."
          icon={FiBarChart2}
        />
      </section>

      {forecastRisk ? (
        <Panel
          title="Riesgo de quiebre por categoría"
          subtitle={`Stock actual de la tienda frente a la demanda pronosticada para ${formatMonth(forecastRisk.month)}.`}
          aside={
            <span
              className={[
                'w-max rounded-full border px-3 py-1 text-xs font-bold',
                RELIABILITY_INFO[forecastRisk.reliability].style,
              ].join(' ')}
            >
              {RELIABILITY_INFO[forecastRisk.reliability].label}
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-right">Stock</th>
                  <th className="p-4 text-right">Demanda esperada</th>
                  <th className="p-4">Prob. de quiebre</th>
                  <th className="p-4">Riesgo</th>
                  <th className="p-4 text-right">Cobertura</th>
                  <th className="p-4 text-right">Reposición sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {forecastRisk.items.map((item) => (
                  <tr key={item.category} className="hover:bg-slate-100/70">
                    <td className="p-4 font-bold text-gray-800">{item.label}</td>
                    <td className="p-4 text-right font-black text-gray-900">{item.stock}</td>
                    <td className="p-4 text-right text-gray-600">
                      {formatUnits(item.forecastMedian)}
                      <span className="text-xs text-gray-400">
                        {' '}
                        (hasta {formatUnits(item.forecastP90)})
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex min-w-36 items-center gap-3">
                        <ShareBar value={item.stockoutProbability} />
                        <span className="w-24 shrink-0 whitespace-nowrap text-right text-xs font-bold text-gray-700">
                          {formatProbability(item.stockoutProbability, item.bound)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={[
                          'inline-flex rounded-full border px-3 py-1 text-xs font-bold',
                          RISK_STYLES[item.riskLevel].style,
                        ].join(' ')}
                      >
                        {RISK_STYLES[item.riskLevel].label}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {item.coverageMonths === null ? '—' : `${item.coverageMonths} meses`}
                    </td>
                    <td className="p-4 text-right font-bold text-gray-800">
                      {item.suggestedReorder > 0 ? `${item.suggestedReorder} u.` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 p-4 text-xs font-semibold text-gray-500">
            La reposición sugerida cubre el escenario alto (percentil 90) del mes. Las categorías de
            la tienda se agrupan en las familias del sistema de pronóstico (p. ej. teclado y mouse).
          </p>
        </Panel>
      ) : null}

      <Panel
        title="Alertas de stock"
        subtitle="Productos agotados o con stock bajo en el inventario actual."
        aside={
          <span className="w-max rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-gray-500">
            {dashboard.alerts.length} alertas activas
          </span>
        }
      >
        {dashboard.alerts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-gray-500">No hay alertas activas de stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Alerta</th>
                  <th className="p-4">Recomendación</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dashboard.alerts.map((alert) => (
                  <tr
                    key={`${alert.productId}-${alert.alertType}`}
                    className="hover:bg-slate-100/70"
                  >
                    <td className="max-w-sm p-4 font-bold text-gray-800">{alert.name}</td>
                    <td className="p-4 text-gray-600">{alert.category}</td>
                    <td className="p-4 font-black text-gray-900">{alert.stock}</td>
                    <td className="p-4">
                      <span
                        className={[
                          'inline-flex w-max rounded-full border px-3 py-1 text-xs font-bold',
                          STATUS_STYLES[alert.status],
                        ].join(' ')}
                      >
                        {STATUS_LABELS[alert.status]}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{alert.recommendation}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingKey)}
                          onClick={() =>
                            void handleAlertAction(alert.productId, alert.alertType, 'REVIEWED')
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 transition hover:border-cyan-300 disabled:cursor-wait disabled:opacity-60"
                        >
                          <FiCheck />
                          {actionLoadingKey === `${alert.productId}:${alert.alertType}:REVIEWED`
                            ? '...'
                            : 'Revisado'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoadingKey)}
                          onClick={() =>
                            void handleAlertAction(alert.productId, alert.alertType, 'DISMISSED')
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
                        >
                          <FiEyeOff />
                          {actionLoadingKey === `${alert.productId}:${alert.alertType}:DISMISSED`
                            ? '...'
                            : 'Omitir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5">
          <h2 className="mb-4 text-lg font-black text-gray-800">Recomendaciones</h2>
          <div className="space-y-3">
            {dashboard.recommendations.map((recommendation, index) => (
              <div
                key={`${recommendation.type}-${index}`}
                className="rounded-lg border border-slate-200 bg-slate-100/70 p-4"
              >
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {recommendation.type}
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-700">{recommendation.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-800">Sistema de pronóstico</h2>
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
              {dashboard.aiStatus.available ? 'Conectado' : 'No disponible'}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-600">
              {dashboard.aiStatus.available
                ? 'El riesgo por categoría usa el pronóstico de demanda de la tesis.'
                : 'Usando análisis local basado en stock actual. Inicia el ai-service para ver el riesgo predictivo.'}
            </p>
            {dashboard.aiStatus.model ? (
              <p className="mt-2 text-sm font-semibold text-gray-600">
                Modelo: {MODEL_LABELS[dashboard.aiStatus.model] ?? dashboard.aiStatus.model}
              </p>
            ) : null}
            {dashboard.aiStatus.lastObservedMonth ? (
              <p className="mt-1 text-sm text-gray-500">
                Ventas registradas hasta {formatMonth(dashboard.aiStatus.lastObservedMonth)}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-gray-500">
              Última actualización: {formatDateTime(dashboard.aiStatus.lastUpdated)}
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void fetchDashboard()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-60"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Recargar inventario
        </button>
      </div>
    </div>
  );
}
