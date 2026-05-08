# 12. Automatización de Pruebas

## 12.1 Herramientas de Automatización

PCSystemStore cuenta con automatización parcial en backend y validaciones de build/typecheck en ambos módulos. La automatización visual y HTTP real está preparada o documentada, pero no puede considerarse aprobada sin ambiente QA completo.

| Herramienta | Uso | Estado | Evidencia |
|---|---|---|---|
| Jest | Pruebas unitarias y de servicios backend. | Implementado | `backend/src/**/*.spec.ts` |
| ts-jest | Ejecución TypeScript en Jest. | Implementado | Configuración Jest en `backend/package.json` |
| Supertest | HTTP E2E real. | Preparado | `backend/test/e2e` |
| Prisma | Acceso a DB y migraciones. | Implementado | `backend/prisma/schema.prisma` |
| Seed QA | Datos controlados para E2E. | Preparado | `backend/prisma/seed-qa.ts` |
| TypeScript compiler | Validación estática backend/frontend. | Implementado | `npx tsc --noEmit` |
| Next.js build | Validación de compilación frontend. | Implementado | `pnpm run build` |
| Playwright/Cypress | E2E visual. | Pendiente | Documentado como fase futura |
| Docker Compose | Validación de orquestación. | Preparado | `docker-compose.yml`, `docker compose config` |
| DATABASE_URL_TEST | DB aislada para HTTP E2E. | Preparado | Bloqueado hasta configurar valor real |

## 12.2 Configuración del Entorno de Pruebas

El proyecto diferencia ambiente local, QA/test y producción futura. Las pruebas HTTP reales deben ejecutarse contra una base aislada, nunca contra producción. Para ello se preparó `DATABASE_URL_TEST`, `.env.test.example`, seed QA y scripts de migración QA.

| Variable | Propósito | Obligatoria | Observación |
|---|---|---|---|
| `DATABASE_URL_TEST` | Base PostgreSQL/Neon aislada para E2E. | Sí para HTTP E2E | Actualmente no configurada en el entorno local |
| `JWT_SECRET_TEST` | Firma JWT para pruebas. | Sí para E2E auth | Debe ser distinto al secreto real |
| `NODE_ENV=test` | Activar modo test y guardas de seguridad. | Sí para seed QA | Evita ejecutar seed en entorno equivocado |
| `DATABASE_URL` | Base principal del backend. | Sí para runtime | No usar producción para pruebas |
| `JWT_SECRET` | Firma JWT runtime. | Sí para backend | No versionar secreto real |
| `NEXT_PUBLIC_API_URL` | URL pública del backend consumida por frontend. | Sí para frontend | Cambia entre local, QA y staging |

`.env.test` debe estar fuera del repositorio y protegido por `.gitignore`. Para QA se recomienda un branch/base Neon separada o PostgreSQL local temporal.

## 12.3 Scripts de Pruebas Automatizadas

| Script/Comando | Descripción | Estado actual | Resultado |
|---|---|---|---|
| `npm test -- --runInBand` | Ejecuta pruebas backend unit/service. | Implementado | OK: 12 suites, 45 tests |
| `npm run test:e2e` | Ejecuta suite E2E configurada. | Preparado | HTTP real bloqueado sin `DATABASE_URL_TEST` |
| `npm run test:e2e:qa` | Migración QA + seed QA + E2E. | Preparado | Pendiente de DB QA |
| `npm run prisma:test:deploy` | Aplica migraciones en DB test. | Preparado | Pendiente de DB QA |
| `npm run seed:qa` | Carga datos QA controlados. | Preparado | Pendiente de DB QA |
| `npm run build` | Compila backend NestJS. | Implementado | OK |
| `npx tsc --noEmit` backend | Typecheck backend. | Implementado | OK |
| `pnpm run build` | Compila frontend Next.js. | Implementado | OK |
| `npx tsc --noEmit` frontend | Typecheck frontend. | Implementado | OK |
| `docker compose config` | Valida sintaxis Compose. | Implementado | OK; warning local de Docker config |
| `docker compose build` | Construye imágenes. | Preparado | No ejecutado todavía |
| `docker compose up` | Levanta servicios. | Preparado | No ejecutado todavía |
| `docker compose down` | Baja servicios. | Preparado | No ejecutado todavía |

## 12.4 Ejecución Automática de Pruebas

Flujo recomendado:

1. Instalar dependencias backend y frontend.
2. Configurar `.env`, `.env.test` y secretos fuera del repositorio.
3. Ejecutar unit tests backend.
4. Ejecutar typecheck backend/frontend.
5. Ejecutar builds backend/frontend.
6. Configurar DB QA con `DATABASE_URL_TEST`.
7. Ejecutar migraciones QA.
8. Ejecutar seed QA.
9. Ejecutar HTTP E2E.
10. Ejecutar E2E visual.
11. Adjuntar evidencias en `docs/evidencias`.

Pipeline CI/CD sugerido:

| Etapa CI/CD | Comando | Resultado esperado | Estado |
|---|---|---|---|
| Instalar backend | `npm ci` | Dependencias reproducibles. | Pendiente CI |
| Test backend | `npm test -- --runInBand` | Suites unit/service OK. | Ejecutable local |
| Typecheck backend | `npx tsc --noEmit` | Sin errores TS. | Ejecutable local |
| Build backend | `npm run build` | Build NestJS OK. | Ejecutable local |
| Instalar frontend | `pnpm install --frozen-lockfile` | Dependencias reproducibles. | Pendiente CI |
| Typecheck frontend | `npx tsc --noEmit` | Sin errores TS. | Ejecutable local |
| Build frontend | `pnpm run build` | Build Next.js OK. | Ejecutable local |
| Docker config | `docker compose config` | Compose válido. | Ejecutable local |
| Migración QA | `npm run prisma:test:deploy` | DB QA actualizada. | Bloqueado por DB QA |
| Seed QA | `npm run seed:qa` | Datos QA cargados. | Bloqueado por DB QA |
| HTTP E2E | `npm run test:e2e` | 8 suites HTTP reales ejecutadas. | Bloqueado por DB QA |
| E2E visual | `npx playwright test` | Flujos UI críticos validados. | Pendiente runner |

No existe todavía evidencia de GitHub Actions u otro CI activo; queda como recomendación para estabilización previa a producción.
