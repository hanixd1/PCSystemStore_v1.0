/**
 * Monthly web-store sales for the forecasting system (ai-service/pronostico).
 *
 * Only PAID orders count, by the month they were paid in Lima time (UTC-5). The month in
 * progress is left out: the forecasting panel holds complete months only. The CSV columns are
 * the ones `python -m pcsforecast.service.web_sales` reads.
 */
export type PaidOrderItem = {
  quantity: number;
  subtotal: number;
  category: string;
  paidAt: Date;
};

export type WebSalesRow = {
  month: string;
  category: string;
  units: number;
  amount: number;
};

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;

export function limaMonth(date: Date): string {
  return new Date(date.getTime() + LIMA_OFFSET_MS).toISOString().slice(0, 7);
}

export function aggregateWebSales(items: PaidOrderItem[], now = new Date()): WebSalesRow[] {
  const currentMonth = limaMonth(now);
  const totals = new Map<string, WebSalesRow>();
  for (const item of items) {
    const month = limaMonth(item.paidAt);
    if (month >= currentMonth || item.quantity <= 0) {
      continue;
    }
    const key = `${month}|${item.category}`;
    const row = totals.get(key) ?? { month, category: item.category, units: 0, amount: 0 };
    row.units += item.quantity;
    row.amount = Math.round((row.amount + item.subtotal) * 100) / 100;
    totals.set(key, row);
  }
  return [...totals.values()].sort(
    (left, right) =>
      left.month.localeCompare(right.month) || left.category.localeCompare(right.category),
  );
}

export function toWebSalesCsv(rows: WebSalesRow[]): string {
  const lines = rows.map((row) =>
    [row.month, row.category, row.units, row.amount.toFixed(2)].join(','),
  );
  return ['month,category,units,amount', ...lines].join('\n') + '\n';
}
