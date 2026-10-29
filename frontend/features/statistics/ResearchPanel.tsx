'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiCalendar, FiDatabase, FiLayers } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { ShareBar, SourcesChart } from './charts';
import {
  LEVEL_LABELS,
  formatCurrency,
  formatDecimal,
  formatMonth,
  formatUnits,
  getTechnicalErrorDetail,
} from './format';
import { ErrorBox, LoadingBox, Panel, StatCard } from './ui';
import type { ResearchSummary } from './types';

const LEVELS = ['category', 'sku', 'total'] as const;

const DECISION_STYLES: Record<string, string> = {
  Aceptada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Parcialmente aceptada': 'border-amber-200 bg-amber-50 text-amber-700',
};

function LevelTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (level: (typeof LEVELS)[number]) => void;
}) {
  return (
    <div className="flex w-max gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-black transition',
            value === level ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800',
          ].join(' ')}
        >
          {LEVEL_LABELS[level]}
        </button>
      ))}
    </div>
  );
}

export function ResearchPanel() {
  const [research, setResearch] = useState<ResearchSummary | null>(null);
  const [error, setError] = useState<{ message: string; detail: string } | null>(null);
  const [accuracyLevel, setAccuracyLevel] = useState<(typeof LEVELS)[number]>('category');
  const [inventoryLevel, setInventoryLevel] = useState<(typeof LEVELS)[number]>('category');

  useEffect(() => {
    api
      .get<ResearchSummary>('/statistics/forecast/research', { timeout: 60000 })
      .then((response) => setResearch(response.data))
      .catch((requestError: unknown) =>
        setError({
          message: getApiErrorMessage(requestError, 'No se pudieron cargar los resultados.'),
          detail: getTechnicalErrorDetail(requestError),
        }),
      );
  }, []);

  const accuracyRows = useMemo(
    () => research?.accuracy?.rows.filter((row) => row.level === accuracyLevel) ?? [],
    [research, accuracyLevel],
  );
  const inventoryRows = useMemo(
    () => research?.inventory?.rows.filter((row) => row.level === inventoryLevel) ?? [],
    [research, inventoryLevel],
  );

  if (error) return <ErrorBox message={error.message} detail={error.detail} />;
  if (!research) return <LoadingBox text="Cargando resultados del sistema de pronóstico..." />;

  const { data } = research;
  const patternLevels = ['category', 'sku'].map((level) => ({
    level,
    rows: research.patterns.filter((row) => row.level === level),
  }));

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Periodo registrado"
          value={`${data.months} meses`}
          description={`De ${formatMonth(data.firstMonth)} a ${formatMonth(data.lastMonth)}.`}
          icon={FiCalendar}
        />
        <StatCard
          label="Unidades vendidas"
          value={formatUnits(data.units)}
          description={`Venta registrada de ${formatCurrency(data.amount)} en el periodo.`}
          icon={FiDatabase}
        />
        <StatCard
          label="Catálogo analizado"
          value={formatUnits(data.skus)}
          description={`Productos (SKU) en ${data.categories} categorías.`}
          icon={FiLayers}
        />
        <StatCard
          label="Configuración congelada"
          value={research.freeze.tag ?? '—'}
          description="Modelos y parámetros fijados antes de abrir la prueba final."
          icon={FiAward}
          highlight
        />
      </section>

      <Panel
        title="Demanda mensual por fuente"
        subtitle="Unidades del registro de vecinos y de los comprobantes entregados (serie principal = suma de ambos)."
      >
        <div className="p-5">
          <SourcesChart sources={research.sources} structuralBreak={data.structuralBreak} />
        </div>
      </Panel>

      {research.accuracy ? (
        <Panel
          title="Exactitud en la prueba final"
          subtitle={`Pronóstico a 1 mes sobre ${research.accuracy.origins} orígenes (${research.accuracy.testWindow?.test_start ?? ''} a ${research.accuracy.testWindow?.test_end ?? ''}). Menor MASE y rango = mejor.`}
          aside={<LevelTabs value={accuracyLevel} onChange={setAccuracyLevel} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">#</th>
                  <th className="p-4">Modelo</th>
                  <th className="p-4 text-right">Series</th>
                  <th className="p-4 text-right">MASE (mediana)</th>
                  <th className="p-4 text-right">RMSSE (mediana)</th>
                  <th className="p-4 text-right">Rango medio</th>
                  <th className="p-4">Supera al ingenuo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {accuracyRows.map((row, index) => (
                  <tr
                    key={row.model}
                    className={index === 0 ? 'bg-cyan-50/70' : 'hover:bg-slate-100/70'}
                  >
                    <td className="p-4 font-black text-gray-400">{index + 1}</td>
                    <td className="p-4 font-bold text-gray-800">{row.label}</td>
                    <td className="p-4 text-right text-gray-600">{row.series}</td>
                    <td className="p-4 text-right font-black text-gray-900">
                      {formatDecimal(row.medianMase, 3)}
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {formatDecimal(row.medianRmsse, 3)}
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {formatDecimal(row.meanRank, 2)}
                    </td>
                    <td className="p-4">
                      <div className="flex min-w-32 items-center gap-3">
                        <ShareBar value={row.shareBeatsNaive} tone="cyan" />
                        <span className="w-12 shrink-0 whitespace-nowrap text-right text-xs font-bold text-gray-500">
                          {Math.round(row.shareBeatsNaive * 100)} %
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {research.inventory ? (
        <Panel
          title="Servicio frente a inventario"
          subtitle={`Política (R, S) común con meta de fill rate ${Math.round(research.inventory.fillRateTarget * 100)} % y plazo de ${research.inventory.leadTime} mes.`}
          aside={<LevelTabs value={inventoryLevel} onChange={setInventoryLevel} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4">Modelo</th>
                  <th className="p-4">Fill rate</th>
                  <th className="p-4 text-right">Inventario promedio</th>
                  <th className="p-4 text-right">Ventas perdidas (u)</th>
                  <th className="p-4 text-right">Ventas perdidas (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inventoryRows.map((row) => (
                  <tr key={row.model} className="hover:bg-slate-100/70">
                    <td className="p-4 font-bold text-gray-800">{row.label}</td>
                    <td className="p-4">
                      <div className="flex min-w-36 items-center gap-3">
                        <ShareBar value={row.fillRate ?? 0} />
                        <span className="w-14 shrink-0 whitespace-nowrap text-right text-xs font-bold text-gray-700">
                          {row.fillRate === null
                            ? '—'
                            : `${formatDecimal(row.fillRate * 100, 1)} %`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {formatDecimal(row.meanOnHand, 1)}
                    </td>
                    <td className="p-4 text-right text-gray-600">{formatUnits(row.lostUnits)}</td>
                    <td className="p-4 text-right font-bold text-gray-800">
                      {formatCurrency(row.lostValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel
          title="Contraste de hipótesis"
          subtitle="Decisiones sobre la prueba final congelada."
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {research.hypotheses.map((hypothesis) => (
              <div
                key={hypothesis.id}
                className="rounded-lg border border-slate-200 bg-white/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-black text-white">
                    {hypothesis.id}
                  </span>
                  <span
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-bold',
                      DECISION_STYLES[hypothesis.decision] ??
                        'border-slate-200 bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {hypothesis.decision}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black text-gray-800">{hypothesis.statement}</p>
                <p className="mt-2 text-sm text-gray-600">{hypothesis.evidence}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Patrones de demanda"
          subtitle="Clasificación ADI-CV² de las series mensuales."
        >
          <div className="space-y-5 p-5">
            {patternLevels.map(({ level, rows }) => {
              const total = rows.reduce((sum, row) => sum + row.series, 0) || 1;
              return (
                <div key={level}>
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">
                    {LEVEL_LABELS[level]}
                  </p>
                  <div className="space-y-2">
                    {rows.map((row) => (
                      <div key={row.pattern} className="flex items-center gap-3 text-sm">
                        <span className="w-24 font-bold text-gray-700">{row.label}</span>
                        <ShareBar value={row.series / total} tone="cyan" />
                        <span className="w-14 shrink-0 whitespace-nowrap text-right text-xs font-bold text-gray-500">
                          {row.series}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>
    </div>
  );
}
