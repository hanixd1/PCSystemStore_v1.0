# 11. Estrategia de Pruebas de Software

## 11.1 Enfoque de Pruebas del Proyecto

La estrategia de pruebas de PCSystemStore es incremental, basada en riesgos y orientada a módulos críticos del negocio. El sistema no se evalúa como un e-commerce genérico: además del catálogo y checkout, debe validar autenticación por roles, stock, pagos manuales, compatibilidad de hardware, auditoría, carga de imágenes, IA asistiva y seguridad básica.

El enfoque se encuentra alineado con ISO/IEC 25010 como marco de calidad de producto software, especialmente en adecuación funcional, fiabilidad, seguridad, mantenibilidad y portabilidad. No se afirma certificación ISO; la documentación refleja aplicación parcial y evidencia progresiva.

| Criterio | Aplicación en PCSystemStore | Evidencia actual | Estado |
|---|---|---|---|
| Enfoque basado en riesgo | Prioriza auth, stock, checkout, pagos, builder, auditoría e IA. | Matriz de pruebas y checklist QA/staging. | Implementado parcialmente |
| Validación funcional | Casos sobre productos, ofertas, carrito, pedidos y pagos manuales. | Pruebas unit/service backend y matriz QA. | Evidencia parcial |
| Validación de seguridad | Roles cliente/admin, JWT, SQLi básica y secretos. | Tests de guards/auth y checklist seguridad. | Evidencia parcial |
| Validación de integración | HTTP E2E con Supertest preparado. | Suites E2E preparadas. | Bloqueado por `DATABASE_URL_TEST` |
| Validación de IA | Runner Python y error controlado. | Test de `AiPythonRunnerService`. | Evidencia parcial |
| Validación de despliegue | Dockerfiles, Compose y config. | `docker compose config` OK. | Preparado para QA/staging |
| Validación de calidad | Auditoría técnica, deuda, métricas y documentación. | `docs/06`, `docs/07`, `docs/08`. | Generado |

## 11.2 Niveles de Pruebas Aplicados

La estrategia contempla pruebas desde lógica unitaria hasta aceptación funcional. El estado actual favorece pruebas automatizadas backend con mocks y pruebas de build/typecheck; las pruebas HTTP reales y visuales aún requieren ambiente QA completo.

| Nivel | Objetivo | Módulos aplicados | Herramienta | Estado |
|---|---|---|---|---|
| Pruebas unitarias | Validar funciones y servicios aislados. | Pricing, builder, IA runner, guards. | Jest, ts-jest. | Ejecutado OK |
| Pruebas de servicio/lógica | Validar reglas de negocio con mocks. | Products, Orders, Payments, Audit. | Jest. | Ejecutado OK |
| Pruebas de integración backend | Validar NestJS + Prisma + DB test. | Auth, productos, checkout, pagos, auditoría. | Supertest, Prisma. | Preparado |
| HTTP E2E preparado | Ejecutar endpoints reales con seed QA. | 8 suites HTTP reales. | Jest E2E + Supertest. | Bloqueado por `DATABASE_URL_TEST` |
| E2E visual | Validar flujos navegador. | Login, catálogo, builder, checkout, admin. | Playwright/Cypress. | Pendiente |
| QA manual/staging | Validar negocio con evidencia. | Pagos manuales, auditoría visual, stock. | Checklist y capturas. | Pendiente/parcial |
| Aceptación | Confirmar aptitud operacional. | Usuario admin/cliente. | Acta o checklist firmado. | Pendiente |

## 11.3 Tipos de Pruebas Ejecutadas

Las pruebas ejecutadas hasta el momento dan evidencia parcial. No sustituyen la ejecución completa en QA/staging con base de datos aislada.

| Tipo de prueba | Descripción | Evidencia | Resultado | Pendiente |
|---|---|---|---|---|
| Funcionales backend | Servicios de auth, productos, ofertas, pagos, stock, auditoría y filtros de catálogo. | `npm test -- --runInBand`. | OK: 12 suites, 52 tests. | HTTP real y UI |
| Integración preparada | Suites HTTP E2E con Supertest. | `backend/test/e2e`. | Preparado. | Configurar `DATABASE_URL_TEST` |
| Regresión | Reejecución de tests tras cambios. | Jest backend. | OK según ejecución local. | CI automático |
| Seguridad básica | SQLi login, token inválido, rol incorrecto, `.env.example`. | Tests backend/documentales. | Evidencia parcial. | SQLi búsqueda, XSS visual, CORS real |
| Compatibilidad hardware | Builder CPU/motherboard/RAM y reglas técnicas. | Tests builder service. | Evidencia parcial. | Cooler/PSU/storage E2E |
| Stock/checkout | Stock insuficiente, snapshots de precio. | Tests OrdersService. | Evidencia parcial. | Concurrencia DB real |
| Pagos manuales | Pendiente, aprobar, rechazar, stock. | Tests PaymentsService. | Evidencia parcial. | HTTP/API real y UI admin |
| Auditoría | Registro y filtrado de logs. | Tests AuditService. | Evidencia parcial. | Validación visual/API real |
| IA | Error controlado si falta script Python. | Test `AiPythonRunnerService`. | Evidencia parcial. | Predictor real y dataset |
| Build/typecheck | Compilación backend/frontend. | `npm run build`, `pnpm run build`, `tsc`. | OK en ejecución local. | CI |
| Docker Compose | Validación sintáctica de orquestación. | `docker compose config`. | OK; warnings de config Docker local. | `docker compose build/up` |

## 11.4 Plan de Ejecución de Pruebas

El plan de pruebas se organiza por fases para reducir riesgo y generar evidencia trazable.

| Fase | Actividades | Requisito previo | Evidencia esperada | Estado |
|---|---|---|---|---|
| Fase 1: unit/service | Ejecutar Jest backend, build y typecheck. | Dependencias instaladas. | Log de consola y reporte QA. | Ejecutado con evidencia parcial |
| Fase 2: HTTP E2E con DB QA | Migrar DB QA, ejecutar seed QA y suites Supertest. | `DATABASE_URL_TEST` real. | Reporte HTTP E2E. | Bloqueado |
| Fase 3: QA/staging manual | Probar admin/cliente, pagos, stock, builder y auditoría. | Ambiente QA levantado. | Capturas y checklist. | Pendiente |
| Fase 4: E2E visual | Automatizar flujos críticos navegador. | Playwright/Cypress configurado. | Reporte E2E visual. | Pendiente |
| Fase 5: seguridad ampliada | SQLi búsqueda, XSS, CORS, endpoints admin. | Ambiente QA no productivo. | Reporte seguridad. | Pendiente |
| Fase 6: preproducción | Concurrencia stock, monitoreo, backups y smoke final. | E2E y seguridad aprobados. | Acta de preproducción. | No iniciado |

QA/staging controlado requiere una base QA real. Producción no se recomienda hasta completar E2E, seguridad, concurrencia, monitoreo y evidencia de operación.
