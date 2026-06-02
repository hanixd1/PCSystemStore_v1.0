# Reporte de Ejecucion QA/Staging - PCSystemStore

## 1. Resumen

Se preparo una fase QA/staging controlada para PCSystemStore con checklist ejecutable, estructura de evidencias y pruebas automatizadas backend minimas de bajo riesgo. Esta revision no sustituye pruebas funcionales E2E ni pruebas manuales con navegador, base de datos y usuarios reales de QA.

## 2. Ambiente probado

| Elemento | Valor |
|---|---|
| Sistema | PCSystemStore |
| Frontend | Next.js / React |
| Backend | NestJS / TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL/Neon segun `.env` del entorno |
| Ambiente de ejecucion | Local |
| Pagos | Simulados/manuales, sin pasarela bancaria real |
| IA | Asistiva, con runner Python |

## 3. Fecha de ejecucion

2026-05-07.

## 4. Responsable

QA Lead / Senior Tech Lead.

## 5. Casos ejecutados

| ID | Caso | Tipo | Resultado |
|---|---|---|---|
| AUTH-01 a AUTH-07 | Separacion cliente/admin, token ausente, token invalido y rol incorrecto. | Automatizada backend con mocks | Aprobado |
| PROD-02 a PROD-07 | Edicion de productos y oferta exclusiva de Editar Producto; creacion fuerza oferta desactivada. | Automatizada backend con mocks | Aprobado |
| STOCK-01, STOCK-02, STOCK-05, STOCK-06, STOCK-07 | Creacion de orden, stock insuficiente y snapshots de precio. | Automatizada backend con mocks | Aprobado |
| PAY-01 a PAY-07 | Pago manual pendiente, aprobacion, rechazo y descuento/no descuento de stock. | Automatizada backend con mocks | Aprobado |
| AUD-01, AUD-02, AUD-03, AUD-07 | Registro de auditoria y filtrado de login cliente. | Automatizada backend con mocks | Aprobado |
| SEC-01, SEC-06 | SQLi basico en login y revision de `.env.example`. | Automatizada backend/documental | Aprobado |
| UNIT-PRICE-01 a UNIT-PRICE-05 | `ProductPricingService`. | Automatizada backend | Aprobado |
| UNIT-BUILD-01, UNIT-BUILD-02 | Builder filtra motherboards/RAM compatibles. | Automatizada backend | Aprobado |
| UNIT-IA-01 | Runner Python informa error controlado si no existe `predictor.py`. | Automatizada backend | Aprobado |
| UNIT-APP-01 | AppController compila con `PrismaService` mockeado. | Automatizada backend | Aprobado |

## 6. Casos aprobados

| Grupo | Resultado |
|---|---|
| Pruebas backend | Ultima ejecucion local: 12 suites aprobadas, 52 tests aprobados. |
| Build backend | Aprobado. |
| Typecheck backend | Aprobado. |
| Build frontend | Aprobado. |
| Typecheck frontend | Aprobado. |

## 7. Casos fallidos

No se registraron fallos despues de corregir el spec legacy de `AppController`.

Fallo corregido durante la ejecucion:

| Caso | Causa | Correccion |
|---|---|---|
| `src/app.controller.spec.ts` | El test no proveia `PrismaService`, requerido por `AppService`. | Se agrego mock de `PrismaService` con `getConnectionState` y `ping`. |
| `frontend/app/categoria/[...slug]/page.tsx` | Dependencias inestables en `useEffect` y slugs no mapeados provocaban loop `Maximum update depth exceeded` y listados incorrectos. | Se memoizaron slugs/filtros/query, se evita `setDraftFilters` si no cambia, se agrego abort de fetch y se mapearon slugs de audio/perifericos. |

## 8. Casos pendientes

| Grupo | Pendiente |
|---|---|
| Auth | Prueba e2e con HTTP real/Supertest + guards globales y base seed QA. |
| Productos/ofertas | Flujo completo UI/API real de crear, editar, activar/desactivar oferta e imagenes. |
| Stock/checkout | Compra aprobada HTTP real, no-negatividad con DB y concurrencia. |
| Pagos manuales | Flujo HTTP real Yape/Plin pendiente, aprobacion, rechazo y auditoria visual. |
| Builder | Validacion E2E de CPU, motherboard, RAM, cooler, PSU y storage. |
| Auditoria | Revision visual/API de logs por dominio. |
| Seguridad | SQLi en busqueda real, XSS visual, CORS real, endpoints admin con/sin token por HTTP. |
| IA | Ejecucion real del predictor y chatbot con dataset de QA. |
| Frontend E2E | No existe Playwright/Cypress configurado actualmente. |

## 9. Bloqueadores

| Bloqueador | Estado | Impacto |
|---|---|---|
| Falta evidencia E2E automatizada frontend. | Pendiente | Riesgo medio para regresiones UI. |
| Falta prueba de concurrencia de stock. | Pendiente | Riesgo alto para ventas simultaneas. |
| Falta evidencia de seguridad controlada. | Pendiente | Riesgo alto antes de produccion. |
| Falta ejecucion manual documentada de pagos manuales. | Pendiente | Riesgo medio/alto en operaciones. |

## 10. Evidencias

| Evidencia | Ubicacion | Estado |
|---|---|---|
| Checklist QA/Staging | `docs/qa_staging_checklist.md` | Generado |
| README evidencias | `docs/evidencias/README.md` | Generado |
| Pruebas unitarias backend | `docs/evidencias/backend_unit_tests.md` | Ejecutado |
| Pruebas HTTP E2E backend | `docs/evidencias/backend_http_e2e.md` | Preparado; bloqueado por falta de `DATABASE_URL_TEST` |
| E2E pendiente | `docs/evidencias/e2e_pendiente.md` | Documentado |
| Capturas/manuales | `docs/evidencias/*` | Pendiente |

## 11. Comandos ejecutados

| Comando | Ubicacion | Resultado |
|---|---|---|
| `npm test -- --runInBand` | `backend` | Aprobado: 12 suites, 52 tests. |
| `npm run test:e2e` | `backend` | Ejecutado: 1 suite legacy aprobada, 8 suites HTTP reales omitidas por falta de `DATABASE_URL_TEST`. |
| `npm run build` | `backend` | Aprobado. |
| `npx tsc --noEmit` | `backend` | Aprobado. |
| `pnpm run build` | `frontend` | Aprobado. |
| `npx tsc --noEmit` | `frontend` | Aprobado. |

## 11.1 Validacion, automatizacion y despliegue documentado

| Elemento | Estado | Evidencia | Observacion |
|---|---|---|---|
| Estrategia de pruebas de software | Generada | `docs/10_estrategia_pruebas_software.md` | Alineada con ISO/IEC 25010; evidencia parcial. |
| Automatizacion de pruebas | Generada | `docs/11_automatizacion_pruebas.md` | HTTP E2E preparado, bloqueado por `DATABASE_URL_TEST`. |
| Metricas de calidad | Generada | `docs/12_metricas_calidad.md` | Requiere actualizacion por ciclo de ejecucion. |
| Implementacion y monitoreo | Generada | `docs/13_implementacion_monitoreo.md` | Monitoreo productivo pendiente. |
| Docker Compose config | Reportado OK | `docs/09_dockerizacion_despliegue.md` | `docker compose build/up` no ejecutado todavia. |
| QA/staging | Preparado parcialmente | `docs/qa_staging_checklist.md` | Depende de DB QA real para HTTP E2E completo. |
| Produccion | No recomendado | `docs/08_reporte_final_revision_tecnica.md` | Faltan E2E, seguridad, concurrencia y monitoreo. |

## 11.2 Limpieza controlada de catalogo

| Elemento | Estado | Resultado | Observacion |
|---|---|---|---|
| Migracion `CpuSpecs.baseTdpWatts` | Preparada | `migration.sql` idempotente con `ADD COLUMN IF NOT EXISTS`. | No se pudo aplicar en Neon desde este entorno por `P1001`. |
| `npx prisma migrate deploy` | Fallido ambiental | `Schema engine error` sin detalle adicional. | No se uso reset. |
| `npx prisma migrate status` | Fallido ambiental | `Schema engine error` sin detalle adicional. | No se uso reset. |
| `npx prisma db execute` | Fallido ambiental | `P1001`: no se alcanza `ep-morning-tooth-aiznn3f2-pooler.c-4.us-east-1.aws.neon.tech:5432`. | Ejecutar cuando Neon/DB QA sea accesible. |
| Script limpieza productos | Creado | `backend/prisma/clean-products.ts`. | Requiere `ALLOW_CLEAN_PRODUCTS=true`; aborta en produccion. |
| Seed limpio productos | Creado | `backend/prisma/seed-products-clean.ts`. | Requiere `ALLOW_SEED_PRODUCTS_CLEAN=true`; aborta en produccion. |
| Usuarios/admin/editores | Conservados | No forman parte del script de limpieza. | Solo se limpian productos y dependencias de catalogo. |
| Branding/banners | Conservados | No forman parte del script de limpieza. | No se borran por defecto. |
| Auditoria | Conservada por defecto | Solo se limpia si `CLEAN_PRODUCT_AUDIT=true`. | No elimina auditoria admin/security por defecto. |

## 12. Fase 2 - Pruebas HTTP E2E Backend

| Configuracion | Estado |
|---|---|
| `DATABASE_URL_TEST` configurado | No |
| Tipo de DB QA usada | No disponible |
| Migraciones en DB QA/test | No ejecutadas |
| Seed QA | No ejecutado |
| Carga `.env.test` en Jest E2E | Implementada |
| Seed QA protegido por `NODE_ENV=test` | Implementado |

| Suite | Casos | Estado | Evidencia | Observaciones |
|---|---|---|---|---|
| Auth HTTP real | AUTH-E2E-01 a AUTH-E2E-08 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST`. |
| Productos/ofertas HTTP real | PROD-E2E-01 a PROD-E2E-09 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST`. |
| Checkout/stock HTTP real | STOCK-E2E-01 a STOCK-E2E-06 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST`. |
| Pagos manuales HTTP real | PAY-E2E-01 a PAY-E2E-09 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST`. |
| Builder HTTP real | BUILD-E2E-01 a BUILD-E2E-07 | Bloqueado parcial | `docs/evidencias/backend_http_e2e.md` | Endpoints actuales cubren CPU/motherboard/RAM; cooler/PSU/configuracion completa quedan pendientes por falta de endpoints. |
| Auditoria HTTP real | AUD-E2E-01 a AUD-E2E-08 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST`. |
| Seguridad HTTP real | SEC-E2E-01 a SEC-E2E-06 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST`. |
| Stock concurrente HTTP real | STOCK-CONC-E2E-01 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere `DATABASE_URL_TEST` y ejecucion contra PostgreSQL QA. |

## 13. Conclusion

Decision actual: **Apto para QA/staging controlado con observaciones** si los comandos finales de build/typecheck/test pasan.

Decision de produccion: **No apto para produccion** hasta completar evidencias criticas de autenticacion, autorizacion, stock, checkout, pagos manuales, builder, auditoria, seguridad y pruebas E2E.
