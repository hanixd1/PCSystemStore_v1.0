import axios from 'axios';
import type { ProbabilityBound, Reliability, RiskLevel } from './types';

export const MODEL_LABELS: Record<string, string> = {
  chronos_fine_tuned: 'Chronos (ajuste ligero)',
  chronos_zero_shot: 'Chronos (zero-shot)',
  ses: 'SES (respaldo estadístico)',
};

export const LEVEL_LABELS: Record<string, string> = {
  total: 'Total',
  category: 'Categoría',
  sku: 'Producto (SKU)',
};

export const RELIABILITY_INFO: Record<
  Reliability,
  { label: string; detail: string; style: string }
> = {
  validated: {
    label: 'Horizonte validado',
    detail: 'La tesis validó la exactitud a 1 mes.',
    style: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  sensitivity: {
    label: 'Validado como sensibilidad',
    detail: 'Hasta 3 meses se evaluó como análisis de sensibilidad.',
    style: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  extrapolation: {
    label: 'Extrapolación',
    detail: 'Más de 3 meses: úsalo como referencia, no como cifra exacta.',
    style: 'border-orange-200 bg-orange-50 text-orange-700',
  },
};

export const RISK_STYLES: Record<RiskLevel, { label: string; style: string }> = {
  LOW: { label: 'Bajo', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  MEDIUM: { label: 'Medio', style: 'border-amber-200 bg-amber-50 text-amber-700' },
  HIGH: { label: 'Alto', style: 'border-orange-200 bg-orange-50 text-orange-700' },
  CRITICAL: { label: 'Crítico', style: 'border-red-200 bg-red-50 text-red-700' },
};

const monthLong = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit' });

function monthDate(month: string) {
  const [year, value] = month.split('-').map(Number);
  return new Date(year, value - 1, 1);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "2026-12" -> "Diciembre de 2026" */
export function formatMonth(month: string) {
  return capitalize(monthLong.format(monthDate(month)));
}

/** "2026-12" -> "dic 26" */
export function formatMonthShort(month: string) {
  return monthShort.format(monthDate(month)).replace('.', '');
}

/** Every month from ``first`` to ``last`` (both "YYYY-MM"). */
export function monthRange(first: string, last: string) {
  const months: string[] = [];
  const cursor = monthDate(first);
  const end = monthDate(last);
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function formatProbability(probability: number, bound: ProbabilityBound = 'within') {
  if (bound === 'above') return 'Más de 90 %';
  if (bound === 'below') return 'Menos de 10 %';
  return `${Math.round(probability * 100)} %`;
}

export function formatUnits(value: number) {
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(value);
}

export function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDateTime(value: string) {
  if (!value) {
    return 'Sin actualizar';
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getTechnicalErrorDetail(error: unknown) {
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
