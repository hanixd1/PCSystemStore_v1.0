import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizePostgresConnectionString } from '../src/prisma/database-url';
import { aggregateWebSales, toWebSalesCsv } from '../src/statistics/web-sales-export';

/**
 * Writes the monthly PAID web sales as CSV for the forecasting system:
 *
 *   npm run export:web-sales -- --out=web_sales.csv
 *
 * then, in ai-service/pronostico: python -m pcsforecast.service.web_sales web_sales.csv
 * Read-only: it never writes to the database.
 */
async function run() {
  const outArgument = process.argv.find((argument) => argument.startsWith('--out='));
  const outPath = outArgument?.slice('--out='.length).trim() || 'web_sales.csv';
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no esta configurado.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: normalizePostgresConnectionString(databaseUrl) }),
  });
  try {
    const items = await prisma.orderItem.findMany({
      where: { order: { status: 'PAID' } },
      select: {
        quantity: true,
        subtotal: true,
        product: { select: { category: true } },
        order: { select: { paidAt: true, updatedAt: true } },
      },
    });
    const rows = aggregateWebSales(
      items.map((item) => ({
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        category: item.product.category,
        // Orders paid before paidAt existed only have their last update.
        paidAt: item.order.paidAt ?? item.order.updatedAt,
      })),
    );
    writeFileSync(outPath, toWebSalesCsv(rows), 'utf8');
    console.log(`${rows.length} filas (mes x categoria) escritas en ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
