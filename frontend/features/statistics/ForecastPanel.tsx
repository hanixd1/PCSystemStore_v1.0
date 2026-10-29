'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiInfo, FiPackage, FiTarget, FiTrendingUp } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { ForecastChart, ShareBar } from './charts';
import {
  MODEL_LABELS,
  RELIABILITY_INFO,
  formatMonth,
  formatProbability,
  formatUnits,
  getTechnicalErrorDetail,
  monthRange,
} from './format';
import { ErrorBox, LoadingBox, Panel, StatCard } from './ui';
import type { ForecastOverview, MonthForecast } from './types';

// The first request may load the forecasting model in the ai-service.
const FORECAST_TIMEOUT_MS = 60000;

export function ForecastPanel() {
  const [overview, setOverview] = useState<ForecastOverview | null>(null);
  const [month, setMonth] = useState('');
  const [thresholdInput, setThresholdInput] = useState('');
  const [threshold, setThreshold] = useState<number | null>(null);
  const [forecast, setForecast] = useState<MonthForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; detail: string } | null>(null);

  const fail = (requestError: unknown, fallback: string) =>
    setError({
      message: getApiErrorMessage(requestError, fallback),
      detail: getTechnicalErrorDetail(requestError),
    });

  useEffect(() => {
    api
      .get<ForecastOverview>('/statistics/forecast/overview', { timeout: FORECAST_TIMEOUT_MS })
      .then((response) => {
        setOverview(response.data);
        setMonth(response.data.defaultMonth);
      })
      .catch((requestError: unknown) => {
        fail(requestError, 'No se pudo conectar con el sistema de pronóstico.');
        setLoading(false);
      });
  }, []);

  const loadForecast = useCallback(async (target: string, units: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<MonthForecast>('/statistics/forecast', {
        params: { month: target, ...(units ? { threshold: units } : {}) },
        timeout: FORECAST_TIMEOUT_MS,
      });
      setForecast(response.data);
    } catch (requestError) {
      fail(requestError, 'No se pudo calcular el pronóstico del mes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (month) void loadForecast(month, threshold);
  }, [month, threshold, loadForecast]);

  const months = useMemo(
    () => (overview ? monthRange(overview.firstForecastMonth, overview.lastForecastMonth) : []),
    [overview],
  );

  const applyThreshold = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(thresholdInput);
    setThreshold(Number.isFinite(value) && value > 0 ? Math.round(value) : null);
  };

  if (!overview) {
    return error ? (
      <ErrorBox message={error.message} detail={error.detail} />
    ) : (
      <LoadingBox text="Conectando con el sistema de pronóstico..." />
    );
  }

  const reliability = forecast ? RELIABILITY_INFO[forecast.reliability] : null;
  const total = forecast?.total;
  const lastYear = total?.sameMonthLastYear;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                Mes a pronosticar
              </span>
              <div className="relative mt-2">
                <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold text-gray-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                >
                  {months.map((option) => (
                    <option key={option} value={option}>
                      {formatMonth(option)}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <form onSubmit={applyThreshold} className="block">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                ¿Probabilidad de vender al menos...?
              </span>
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <FiTarget className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    inputMode="numeric"
                    placeholder="Unidades, p. ej. 150"
                    value={thresholdInput}
                    onChange={(event) => setThresholdInput(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold text-gray-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                >
                  Calcular
                </button>
              </div>
            </form>
          </div>

          <div className="text-sm text-gray-500 lg:max-w-xs lg:text-right">
            <p className="font-bold text-gray-700">
              Datos hasta {formatMonth(overview.lastObservedMonth)}
            </p>
            <p>Modelo: {MODEL_LABELS[overview.model] ?? overview.model}</p>
          </div>
        </div>
      </section>

      {error ? <ErrorBox message={error.message} detail={error.detail} /> : null}

      {loading && !forecast ? <LoadingBox text="Calculando pronóstico..." /> : null}

      {forecast && total && reliability ? (
        <div className={['space-y-8 transition', loading ? 'opacity-60' : ''].join(' ')}>
          <div
            className={['flex items-start gap-3 rounded-lg border p-4', reliability.style].join(
              ' ',
            )}
          >
            <FiInfo className="mt-0.5 shrink-0" size={18} />
            <div className="text-sm">
              <p className="font-black">
                {reliability.label}: {formatMonth(forecast.month)} está a {forecast.horizon}{' '}
                {forecast.horizon === 1 ? 'mes' : 'meses'} del último dato registrado.
              </p>
              <p className="mt-1 font-semibold opacity-90">{reliability.detail}</p>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Unidades esperadas"
              value={formatUnits(total.median)}
              description={`Valor central (mediana) para ${formatMonth(forecast.month)}.`}
              icon={FiTrendingUp}
              highlight
            />
            <StatCard
              label="Rango probable (80 %)"
              value={`${formatUnits(total.p10)} – ${formatUnits(total.p90)}`}
              description="8 de cada 10 escenarios caen dentro de este rango."
              icon={FiTarget}
            />
            <StatCard
              label={lastYear ? `Superar ${formatMonth(lastYear.month)}` : 'Mismo mes año anterior'}
              value={
                lastYear?.probabilityAbove
                  ? formatProbability(
                      lastYear.probabilityAbove.probability,
                      lastYear.probabilityAbove.bound,
                    )
                  : 'N/D'
              }
              description={
                lastYear?.units !== null && lastYear?.units !== undefined
                  ? `Probabilidad de vender más de ${formatUnits(lastYear.units)} unidades.`
                  : 'No hay registro del mismo mes del año anterior.'
              }
              icon={FiCalendar}
            />
            <StatCard
              label={
                total.requested
                  ? `Al menos ${formatUnits(total.requested.units)} u.`
                  : 'Probabilidad por meta'
              }
              value={
                total.requested
                  ? formatProbability(total.requested.probability, total.requested.bound)
                  : '—'
              }
              description={
                total.requested
                  ? 'Probabilidad de alcanzar la meta de ventas indicada.'
                  : 'Ingresa una meta de unidades para calcular su probabilidad.'
              }
              icon={FiPackage}
            />
          </section>

          <Panel
            title="Ventas mensuales y pronóstico"
            subtitle="Unidades vendidas (vecinos + comprobantes) y escenarios probables hasta el mes elegido."
          >
            <div className="p-5">
              <ForecastChart forecast={forecast} />
            </div>
          </Panel>

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Panel
              title="Pronóstico por categoría"
              subtitle={`Unidades esperadas en ${formatMonth(forecast.month)} por familia de producto.`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-4">Categoría</th>
                      <th className="p-4 text-right">Esperadas</th>
                      <th className="p-4 text-right">Rango 80 %</th>
                      <th className="p-4">Participación</th>
                      <th className="p-4 text-right">Año anterior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {forecast.categories.map((category) => (
                      <tr key={category.key} className="hover:bg-slate-100/70">
                        <td className="p-4 font-bold text-gray-800">{category.label}</td>
                        <td className="p-4 text-right font-black text-gray-900">
                          {formatUnits(category.median)}
                        </td>
                        <td className="p-4 text-right text-gray-600">
                          {formatUnits(category.p10)} – {formatUnits(category.p90)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <ShareBar value={category.share} tone="cyan" />
                            <span className="w-12 shrink-0 whitespace-nowrap text-right text-xs font-bold text-gray-500">
                              {Math.round(category.share * 100)} %
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right text-gray-500">
                          {category.sameMonthLastYear ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Probabilidades del total"
              subtitle="Probabilidad de vender al menos cada cantidad en el mes."
            >
              <div className="space-y-3 p-5">
                {total.probabilities.map((point) => (
                  <div key={point.units}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold text-gray-700">
                        ≥ {formatUnits(point.units)} unidades
                      </span>
                      <span className="font-black text-gray-900">
                        {formatProbability(point.probability, point.bound)}
                      </span>
                    </div>
                    <ShareBar value={point.probability} />
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <Panel
            title="Productos con mayor probabilidad de venta"
            subtitle="Probabilidad de vender al menos una unidad en un mes (método TSB sobre los últimos 18 meses)."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="p-4">Producto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Probabilidad de venta</th>
                    <th className="p-4 text-right">Unidades esperadas</th>
                    <th className="p-4 text-right">Vendidas (18 meses)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {forecast.products.map((product) => (
                    <tr key={product.name} className="hover:bg-slate-100/70">
                      <td className="max-w-md p-4 font-bold text-gray-800">{product.name}</td>
                      <td className="p-4 text-gray-600">{product.category}</td>
                      <td className="p-4">
                        <div className="flex min-w-40 items-center gap-3">
                          <ShareBar value={product.probabilityOfSale} tone="cyan" />
                          <span className="w-12 shrink-0 whitespace-nowrap text-right font-bold text-gray-700">
                            {Math.round(product.probabilityOfSale * 100)} %
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900">
                        {product.expectedUnits.toFixed(1)}
                      </td>
                      <td className="p-4 text-right text-gray-500">{product.unitsLast18Months}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
