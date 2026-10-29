import { formatMonth, formatMonthShort, formatUnits } from './format';
import type { MonthForecast, ResearchSummary } from './types';

const WIDTH = 820;
const HEIGHT = 300;
const PAD = { top: 20, right: 20, bottom: 36, left: 48 };
const HISTORY_MONTHS = 24;

const TICKS = 4;

/** Axis maximum split into four round steps (1, 2, 2.5 or 5 times a power of ten). */
function niceMax(value: number) {
  if (value <= 0) return TICKS;
  const raw = value / TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return step * TICKS;
}

function yTicks(max: number) {
  return Array.from({ length: TICKS + 1 }, (_, i) => Math.round((max * i) / TICKS));
}

function GridY({ max, y }: { max: number; y: (value: number) => number }) {
  return (
    <g>
      {yTicks(max).map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-slate-200"
            strokeDasharray={tick === 0 ? undefined : '3 4'}
          />
          <text
            x={PAD.left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            className="fill-gray-400 text-[11px] font-semibold"
          >
            {formatUnits(tick)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Monthly history (last 24 months) followed by the forecast fan up to the target month. */
export function ForecastChart({ forecast }: { forecast: MonthForecast }) {
  const history = forecast.history.slice(-HISTORY_MONTHS);
  const months = [...history.map((point) => point.month), ...forecast.path.map((p) => p.month)];
  const max = niceMax(
    Math.max(...history.map((point) => point.units), ...forecast.path.map((point) => point.p90)),
  );
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (index / Math.max(months.length - 1, 1)) * innerWidth;
  const y = (value: number) => PAD.top + innerHeight - (value / max) * innerHeight;
  const lastIndex = history.length - 1;
  const lastValue = history[lastIndex]?.units ?? 0;

  const historyLine = history.map((point, i) => `${x(i)},${y(point.units)}`).join(' ');
  const forecastIndex = (i: number) => lastIndex + 1 + i;
  const band = (low: 'p10' | 'p25', high: 'p75' | 'p90') => {
    const upper = forecast.path.map((p, i) => `${x(forecastIndex(i))},${y(p[high])}`);
    const lower = forecast.path.map((p, i) => `${x(forecastIndex(i))},${y(p[low])}`).reverse();
    return [`${x(lastIndex)},${y(lastValue)}`, ...upper, ...lower].join(' ');
  };
  const medianLine = [
    `${x(lastIndex)},${y(lastValue)}`,
    ...forecast.path.map((p, i) => `${x(forecastIndex(i))},${y(p.median)}`),
  ].join(' ');
  const target = forecast.path[forecast.path.length - 1];
  const targetX = x(months.length - 1);
  const labelEvery = Math.max(1, Math.ceil(months.length / 12));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label={`Unidades vendidas por mes y pronóstico hasta ${formatMonth(forecast.month)}`}
      >
        <GridY max={max} y={y} />
        <rect
          x={x(lastIndex)}
          y={PAD.top}
          width={WIDTH - PAD.right - x(lastIndex)}
          height={innerHeight}
          className="fill-cyan-50/60"
        />
        <line
          x1={x(lastIndex)}
          x2={x(lastIndex)}
          y1={PAD.top}
          y2={PAD.top + innerHeight}
          className="stroke-slate-300"
          strokeDasharray="4 4"
        />
        <text
          x={x(lastIndex) + 6}
          y={PAD.top + 12}
          className="fill-cyan-700 text-[11px] font-black uppercase tracking-wider"
        >
          Pronóstico
        </text>
        <polygon points={band('p10', 'p90')} className="fill-cyan-200/60" />
        <polygon points={band('p25', 'p75')} className="fill-cyan-400/50" />
        <polyline
          points={historyLine}
          fill="none"
          className="stroke-gray-900"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {history.map((point, i) => (
          <circle key={point.month} cx={x(i)} cy={y(point.units)} r={3} className="fill-gray-900">
            <title>{`${formatMonth(point.month)}: ${formatUnits(point.units)} unidades`}</title>
          </circle>
        ))}
        <polyline
          points={medianLine}
          fill="none"
          className="stroke-cyan-700"
          strokeWidth={2.5}
          strokeDasharray="6 4"
        />
        {forecast.path.map((point, i) => (
          <circle
            key={point.month}
            cx={x(forecastIndex(i))}
            cy={y(point.median)}
            r={3}
            className="fill-cyan-700"
          >
            <title>{`${formatMonth(point.month)}: ${formatUnits(point.median)} u. (rango ${formatUnits(point.p10)}-${formatUnits(point.p90)})`}</title>
          </circle>
        ))}
        {target ? (
          <g>
            <circle
              cx={targetX}
              cy={y(target.median)}
              r={7}
              className="fill-white stroke-cyan-600"
              strokeWidth={3}
            />
            <line
              x1={targetX}
              x2={targetX}
              y1={y(target.p90)}
              y2={y(target.p10)}
              className="stroke-cyan-700"
              strokeWidth={2}
            />
          </g>
        ) : null}
        {months.map((month, i) =>
          i % labelEvery === 0 || i === months.length - 1 ? (
            <text
              key={month}
              x={x(i)}
              y={HEIGHT - 12}
              textAnchor="middle"
              className={
                i > lastIndex
                  ? 'fill-cyan-700 text-[11px] font-bold'
                  : 'fill-gray-400 text-[11px] font-semibold'
              }
            >
              {formatMonthShort(month)}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-gray-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-gray-900" /> Ventas registradas
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-cyan-700" /> Pronóstico
          (mediana)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-cyan-400/50" /> 50 % probable
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-cyan-200/60" /> 80 % probable
        </span>
      </div>
    </div>
  );
}

/** Monthly units by source (vecinos record and delivered receipts), stacked. */
export function SourcesChart({
  sources,
  structuralBreak,
}: {
  sources: ResearchSummary['sources'];
  structuralBreak: string;
}) {
  const months = [...new Set(sources.map((row) => row.month))].sort();
  const byMonth = new Map(months.map((month) => [month, { vecinos: 0, facturado: 0 }]));
  for (const row of sources) {
    const entry = byMonth.get(row.month);
    if (entry) entry[row.channel] = row.units;
  }
  const max = niceMax(
    Math.max(...[...byMonth.values()].map((value) => value.vecinos + value.facturado)),
  );
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerWidth / Math.max(months.length, 1);
  const barWidth = slot * 0.68;
  const y = (value: number) => PAD.top + innerHeight - (value / max) * innerHeight;
  const breakIndex = months.indexOf(structuralBreak);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="Unidades por mes según fuente de registro"
      >
        <GridY max={max} y={y} />
        {breakIndex >= 0 ? (
          <g>
            <line
              x1={PAD.left + breakIndex * slot}
              x2={PAD.left + breakIndex * slot}
              y1={PAD.top}
              y2={PAD.top + innerHeight}
              className="stroke-orange-400"
              strokeDasharray="4 4"
            />
            <text
              x={PAD.left + breakIndex * slot + 6}
              y={PAD.top + 12}
              className="fill-orange-600 text-[11px] font-black"
            >
              Escasez de componentes
            </text>
          </g>
        ) : null}
        {months.map((month, i) => {
          const value = byMonth.get(month) ?? { vecinos: 0, facturado: 0 };
          const left = PAD.left + i * slot + (slot - barWidth) / 2;
          return (
            <g key={month}>
              <title>{`${formatMonth(month)}: ${value.vecinos} vecinos + ${value.facturado} facturado`}</title>
              <rect
                x={left}
                y={y(value.vecinos)}
                width={barWidth}
                height={y(0) - y(value.vecinos)}
                rx={2}
                className="fill-gray-800"
              />
              <rect
                x={left}
                y={y(value.vecinos + value.facturado)}
                width={barWidth}
                height={y(0) - y(value.facturado)}
                rx={2}
                className="fill-cyan-400"
              />
              {i % 3 === 0 ? (
                <text
                  x={left + barWidth / 2}
                  y={HEIGHT - 12}
                  textAnchor="middle"
                  className="fill-gray-400 text-[11px] font-semibold"
                >
                  {formatMonthShort(month)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-gray-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-gray-800" /> Registro de vecinos
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-cyan-400" /> Comprobantes (facturas y boletas)
        </span>
      </div>
    </div>
  );
}

/** Horizontal share bar used inside tables. */
export function ShareBar({ value, tone = 'dark' }: { value: number; tone?: 'dark' | 'cyan' }) {
  return (
    <div className="h-2 w-full min-w-20 rounded-full bg-slate-200">
      <div
        className={['h-2 rounded-full', tone === 'cyan' ? 'bg-cyan-500' : 'bg-gray-900'].join(' ')}
        style={{ width: `${Math.max(2, Math.min(value, 1) * 100)}%` }}
      />
    </div>
  );
}
