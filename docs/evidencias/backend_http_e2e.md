# Evidencia - Pruebas HTTP E2E Backend

## Datos generales

| Campo | Valor |
|---|---|
| Fecha | 2026-05-07 |
| Ambiente | Local |
| Responsable | QA Lead / Senior Tech Lead |
| Comando | `npm run test:e2e` |
| Ubicacion | `backend` |

## Configuracion DATABASE_URL_TEST

| Item | Estado |
|---|---|
| `backend/.env.test.example` | Creado |
| `backend/.env.test` | No existe en este entorno |
| `DATABASE_URL_TEST` | No configurado |
| DB QA usada | No disponible |
| Migraciones QA/test | No ejecutadas por falta de `DATABASE_URL_TEST` |
| Seed QA | No ejecutado por falta de `DATABASE_URL_TEST` |

## Resultado ejecutado

```text
Test Suites: 8 skipped, 1 passed, 1 of 9 total
Tests:       42 skipped, 5 passed, 47 total
Snapshots:   0 total
```

## Interpretacion QA

El comando `npm run test:e2e` fue ejecutado correctamente. Sin embargo, las suites HTTP reales que usan `AppModule`, `Prisma` y Supertest quedaron omitidas porque el entorno local no tiene configurada la variable `DATABASE_URL_TEST`.

Esto evita tocar una base de datos de desarrollo o produccion por accidente. La infraestructura de pruebas queda preparada para ejecutarse apenas exista una base QA/test.

## Carga segura de variables

Se agrego `backend/test/setup-e2e.ts` para cargar `.env.test` y `.env.test.local` antes de las pruebas E2E. Si encuentra `DATABASE_URL_TEST`, asigna:

```text
DATABASE_URL = DATABASE_URL_TEST
NODE_ENV = test
JWT_SECRET = JWT_SECRET_TEST
```

Si `DATABASE_URL_TEST` no existe, las suites HTTP reales quedan omitidas con mensaje visible.

## Suites preparadas

| Suite | Archivo | Estado actual |
|---|---|---|
| Auth HTTP real | `backend/test/e2e/auth.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Productos/ofertas HTTP real | `backend/test/e2e/products-offers.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Checkout/stock HTTP real | `backend/test/e2e/checkout-stock.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Pagos manuales HTTP real | `backend/test/e2e/manual-payments.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Builder HTTP real | `backend/test/e2e/builder.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Auditoria HTTP real | `backend/test/e2e/audit.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Seguridad HTTP real | `backend/test/e2e/security.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| Stock concurrente HTTP real | `backend/test/e2e/stock-concurrency.e2e-spec.ts` | Omitida por falta de `DATABASE_URL_TEST` |
| E2E legacy con mocks | `backend/test/app.e2e-spec.ts` | Ejecutada OK |

## Configuracion requerida para ejecutar HTTP real

1. Crear una base PostgreSQL exclusiva para QA/test.
2. Copiar `backend/.env.test.example` como referencia.
3. Definir `DATABASE_URL_TEST` apuntando solo a la base QA/test.
4. Ejecutar migraciones sobre la base QA/test:

```bash
npm run prisma:test:deploy
```

5. Ejecutar seed QA:

```bash
npm run seed:qa
```

6. Ejecutar:

```bash
npm run test:e2e
```

Alternativa Windows PowerShell:

```powershell
$env:NODE_ENV="test"
$env:DATABASE_URL_TEST="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
npm run prisma:test:deploy
npm run seed:qa
npm run test:e2e
```

## Scripts disponibles

| Script | Proposito |
|---|---|
| `npm run prisma:test:deploy` | Carga `.env.test`, asigna `DATABASE_URL=DATABASE_URL_TEST` y ejecuta `prisma migrate deploy`. |
| `npm run seed:qa` | Ejecuta `prisma/seed-qa.ts` solo si `NODE_ENV=test` o `QA_SEED_ALLOW=true`. |
| `npm run test:e2e:qa` | Ejecuta seed QA y luego `test:e2e`. |

## Decision

La fase HTTP real queda **preparada pero bloqueada por entorno**. No debe marcarse como aprobada hasta ejecutar las 8 suites omitidas contra una base QA/test real.
