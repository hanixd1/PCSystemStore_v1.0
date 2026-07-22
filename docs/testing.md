# Pruebas

El repositorio usa npm y los lockfiles `package-lock.json` de cada aplicación son
la fuente de instalación reproducible usada por CI.

## Frontend

```bash
cd frontend
npm ci
npm run test
npm run test:coverage
```

`npm run test` ejecuta las pruebas Vitest de `frontend/tests`, incluida la
regresión de enrutamiento administrativo, y la lógica pura de `frontend/lib`.
`npm run test:watch` deja Vitest en modo observación. La cobertura HTML queda en
`frontend/coverage`; su alcance inicial mide `pricing`, `normalizers`,
`productPayload` y el enrutamiento administrativo.

## E2E QA del backend

Las suites HTTP E2E usan una base de datos exclusivamente de prueba. Cree una
base PostgreSQL local y defina estas variables antes de ejecutarlas:

```bash
cd backend
set NODE_ENV=test
set DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/pcsystemstore_test?schema=public
set JWT_SECRET_TEST=test-jwt-secret
npm ci
npm run test:e2e:qa
```

En PowerShell se puede usar `$env:NODE_ENV = 'test'` y el mismo patrón para las
otras variables. `test:e2e:qa` aplica las migraciones a `DATABASE_URL_TEST`,
ejecuta el seed QA y corre las nueve suites E2E de stock, pagos, seguridad,
autorización, catálogo, auditoría y checkout. No configure una URL de Neon o
producción en `DATABASE_URL_TEST`.

## GitHub Actions

`.github/workflows/qa-tests.yml` se ejecuta en cada push y pull request hacia
`main`. Tiene un job de pruebas unitarias del frontend y otro que inicia
PostgreSQL 16 con healthcheck, ejecuta migraciones/seed QA y corre
`npm run test:e2e:qa`. Todas las URLs y secretos de ese job son valores de
prueba locales al contenedor.
# Pruebas de endurecimiento de seguridad

Las suites unitarias cubren Argon2id/bcrypt heredado, bloqueo administrativo, CSRF, almacenamiento de rate limit, XLSX validos y maliciosos y ZIP bombs. `backend/test/security-http.e2e-spec.ts` valida Helmet, HSTS, CORS, 413, 429, `Retry-After`, health sin throttle y CSRF sin base de datos.

Las suites de `backend/test/e2e/` que ejercitan Prisma requieren `DATABASE_URL_TEST` y deben ejecutarse solo contra una base aislada:

```bash
cd backend
npm run prisma:test:deploy
npm run seed:qa
npm run test:e2e
```

Consulte [security-hardening.md](security-hardening.md) para la matriz de comandos completa.
