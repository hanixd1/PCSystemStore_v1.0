import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizePostgresConnectionString } from '../src/prisma/database-url';

type DiagnosticOptions = {
  apply: boolean;
  includeDeleted: boolean;
  ids: string[];
  skus: string[];
  names: string[];
  createdBefore?: Date;
  updatedBefore?: Date;
  limit: number;
};

const APPLY_CONFIRMATION = 'DEACTIVATE_MATCHED_PRODUCTS';

function parseDate(value: string, option: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${option} debe ser una fecha ISO valida.`);
  }
  return date;
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} debe ser un entero positivo.`);
  }
  return parsed;
}

function optionValue(argument: string, name: string): string | undefined {
  const prefix = `--${name}=`;
  return argument.startsWith(prefix) ? argument.slice(prefix.length).trim() : undefined;
}

function parseOptions(argumentsList: string[]): DiagnosticOptions {
  const options: DiagnosticOptions = {
    apply: false,
    includeDeleted: false,
    ids: [],
    skus: [],
    names: [],
    limit: 100,
  };

  for (const argument of argumentsList) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }
    if (argument === '--include-deleted') {
      options.includeDeleted = true;
      continue;
    }

    const id = optionValue(argument, 'id');
    if (id !== undefined) {
      if (id) {
        options.ids.push(id);
      }
      continue;
    }
    const sku = optionValue(argument, 'sku');
    if (sku !== undefined) {
      if (sku) {
        options.skus.push(sku.toUpperCase());
      }
      continue;
    }
    const name = optionValue(argument, 'name-contains');
    if (name !== undefined) {
      if (name) {
        options.names.push(name);
      }
      continue;
    }
    const createdBefore = optionValue(argument, 'created-before');
    if (createdBefore !== undefined) {
      options.createdBefore = parseDate(createdBefore, '--created-before');
      continue;
    }
    const updatedBefore = optionValue(argument, 'updated-before');
    if (updatedBefore !== undefined) {
      options.updatedBefore = parseDate(updatedBefore, '--updated-before');
      continue;
    }
    const limit = optionValue(argument, 'limit');
    if (limit !== undefined) {
      options.limit = Math.min(parsePositiveInteger(limit, '--limit'), 1_000);
      continue;
    }

    throw new Error(`Opcion no reconocida: ${argument}`);
  }

  return options;
}

function hasExplicitSelector(options: DiagnosticOptions): boolean {
  return Boolean(
    options.ids.length ||
    options.skus.length ||
    options.names.length ||
    options.createdBefore ||
    options.updatedBefore,
  );
}

function buildWhere(options: DiagnosticOptions): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  const identifiers: Prisma.ProductWhereInput[] = [];

  if (options.ids.length) {
    identifiers.push({ id: { in: options.ids } });
  }
  if (options.skus.length) {
    identifiers.push({ sku: { in: options.skus } });
  }
  identifiers.push(
    ...options.names.map((name) => ({
      name: { contains: name, mode: 'insensitive' as const },
    })),
  );
  if (identifiers.length) {
    and.push({ OR: identifiers });
  }
  if (options.createdBefore) {
    and.push({ createdAt: { lt: options.createdBefore } });
  }
  if (options.updatedBefore) {
    and.push({ updatedAt: { lt: options.updatedBefore } });
  }
  if (!options.includeDeleted || options.apply) {
    and.push({ deletedAt: null });
  }
  if (options.apply) {
    and.push({ isActive: true });
  }

  return and.length ? { AND: and } : {};
}

function getMaximumDeactivationCount(): number {
  return parsePositiveInteger(
    process.env.MAX_PRODUCT_DEACTIVATION?.trim() || '100',
    'MAX_PRODUCT_DEACTIVATION',
  );
}

function printUsage(): void {
  console.log(`
Diagnostico seguro de productos (solo lectura por defecto)

  npm run products:diagnose -- --created-before=2025-01-01
  npm run products:diagnose -- --name-contains="modelo antiguo" --sku=SKU-LEGACY
  npm run products:diagnose -- --id=<uuid> --limit=200

Para desactivar exactamente los registros seleccionados, sin borrarlos:

  CONFIRM_PRODUCT_DEACTIVATION=${APPLY_CONFIRMATION} \
    npm run products:diagnose -- --sku=SKU-LEGACY --apply

Selectores repetibles: --id, --sku, --name-contains.
Filtros combinables: --created-before, --updated-before.
--apply exige al menos un selector y respeta MAX_PRODUCT_DEACTIVATION.
`);
}

async function run(): Promise<void> {
  if (process.argv.includes('--help')) {
    printUsage();
    return;
  }

  const options = parseOptions(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL debe estar configurado para diagnosticar productos.');
  }

  if (options.apply && !hasExplicitSelector(options)) {
    throw new Error('--apply exige al menos un selector explicito.');
  }
  if (options.apply && process.env.CONFIRM_PRODUCT_DEACTIVATION?.trim() !== APPLY_CONFIRMATION) {
    throw new Error(
      `Para aplicar, define CONFIRM_PRODUCT_DEACTIVATION=${APPLY_CONFIRMATION} solo durante esta ejecucion.`,
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePostgresConnectionString(databaseUrl),
    }),
  });

  try {
    const where = buildWhere(options);
    const [total, active, inactive, softDeleted, matched, products] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.product.count({ where: { isActive: false, deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: { not: null } } }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          slug: true,
          name: true,
          category: true,
          price: true,
          stock: true,
          isActive: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'asc' }, { name: 'asc' }],
        take: options.limit,
      }),
    ]);

    console.log(
      JSON.stringify(
        {
          mode: options.apply ? 'apply' : 'dry-run',
          summary: { total, active, inactive, softDeleted, matched },
          shown: products.length,
          truncated: matched > products.length,
          products: products.map((product) => ({
            ...product,
            price: product.price.toString(),
          })),
        },
        null,
        2,
      ),
    );

    if (!options.apply || matched === 0) {
      return;
    }

    if (matched > products.length) {
      throw new Error(
        `Se bloquearon los cambios: el reporte mostro ${products.length} de ${matched} coincidencias. Aumenta --limit y revisa todas antes de aplicar.`,
      );
    }

    const maximum = getMaximumDeactivationCount();
    if (matched > maximum) {
      throw new Error(
        `Se bloquearon ${matched} cambios: exceden MAX_PRODUCT_DEACTIVATION=${maximum}. Revisa los selectores.`,
      );
    }

    const result = await prisma.product.updateMany({
      where,
      data: { isActive: false },
    });
    console.log(`Productos desactivados sin borrado: ${result.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
