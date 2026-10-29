import { aggregateWebSales, limaMonth, toWebSalesCsv } from './web-sales-export';

describe('web sales export', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const item = (paidAt: string, category: string, quantity: number, subtotal: number) => ({
    paidAt: new Date(paidAt),
    category,
    quantity,
    subtotal,
  });

  it('usa el mes de Lima (UTC-5)', () => {
    expect(limaMonth(new Date('2026-10-01T03:00:00Z'))).toBe('2026-09');
    expect(limaMonth(new Date('2026-10-01T06:00:00Z'))).toBe('2026-10');
  });

  it('suma por mes y categoria y deja fuera el mes en curso', () => {
    const rows = aggregateWebSales(
      [
        item('2026-10-05T15:00:00Z', 'MOUSE', 2, 120),
        item('2026-10-20T15:00:00Z', 'MOUSE', 1, 60.5),
        item('2026-10-21T15:00:00Z', 'CPU', 1, 900),
        item('2026-09-30T15:00:00Z', 'CPU', 1, 880),
        item('2026-11-02T15:00:00Z', 'CPU', 3, 2700),
      ],
      now,
    );

    expect(rows).toEqual([
      { month: '2026-09', category: 'CPU', units: 1, amount: 880 },
      { month: '2026-10', category: 'CPU', units: 1, amount: 900 },
      { month: '2026-10', category: 'MOUSE', units: 3, amount: 180.5 },
    ]);
    expect(toWebSalesCsv(rows)).toBe(
      'month,category,units,amount\n2026-09,CPU,1,880.00\n2026-10,CPU,1,900.00\n2026-10,MOUSE,3,180.50\n',
    );
  });
});
