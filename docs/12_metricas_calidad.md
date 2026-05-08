# 13. Métricas de Calidad

## 13.1 Ejecución de Casos de Pruebas

Las métricas siguientes reflejan evidencia parcial y la última ejecución local documentada en este ciclo. La línea base previa era 11 suites y 37 tests backend; la ejecución actual reportó 12 suites y 45 tests aprobados.

| Métrica | Valor actual | Evidencia | Estado |
|---|---|---|---|
| Backend unit/service suites | 12 suites aprobadas | `npm test -- --runInBand` | Validado localmente |
| Backend unit/service tests | 45 tests aprobados | `npm test -- --runInBand` | Validado localmente |
| Backend build | OK | `npm run build` | Validado localmente |
| Backend typecheck | OK | `npx tsc --noEmit` | Validado localmente |
| Frontend build | OK | `pnpm run build` | Validado localmente |
| Frontend typecheck | OK | `npx tsc --noEmit` | Validado localmente |
| Docker Compose config | OK | `docker compose config` | Validado localmente |
| HTTP E2E real | 8 suites preparadas/omitidas | `docs/evidencias/backend_http_e2e.md` | Bloqueado por `DATABASE_URL_TEST` |
| E2E visual | Sin runner configurado | `docs/evidencias/e2e_pendiente.md` | Pendiente |
| Producción | No recomendada | `docs/08_reporte_final_revision_tecnica.md` | Pendiente de evidencias críticas |

## 13.2 Registro de Defectos

| ID | Fecha | Módulo | Defecto | Severidad | Estado | Corrección | Evidencia |
|---|---|---|---|---|---|---|---|
| DEF-001 | 2026-05 | Productos/ofertas | `salePrice` se validaba aunque oferta estuviera desactivada. | Alta | Corregido | Validación condicional y oferta exclusiva de Editar Producto. | Tests ProductsService/Pricing |
| DEF-002 | 2026-05 | Agregar Producto | El formulario no se limpiaba tras crear producto. | Media | Corregido | `resetProductForm()` y remount del formulario. | Build frontend OK |
| DEF-003 | 2026-05 | Auth | Riesgo de login cruzado cliente/admin. | Alta | Corregido con evidencia parcial | Separación por rol en login y guards. | Tests auth/guards |
| DEF-004 | 2026-05 | Auditoría | Login de clientes saturaba historial administrativo. | Media | Corregido/mitigado | Filtrado de eventos cliente. | Tests AuditService |
| DEF-005 | 2026-05 | Imágenes | Admin debía pegar URLs manuales. | Media | Corregido | Uploader local reutilizable. | Build frontend OK |
| DEF-006 | 2026-05 | IA/Python | Falla por dependencia o script ausente podía romper flujo. | Media | Mitigado | Runner Python con error controlado. | Test `AiPythonRunnerService` |
| DEF-007 | 2026-05 | DB/Neon | Prisma P1001 por conexión remota no disponible. | Alta | Pendiente ambiental | Requiere revisar `DATABASE_URL`, red y Neon. | Pendiente de validación |
| DEF-008 | 2026-05 | CORS | Riesgo de origen mal configurado entre frontend/backend. | Media | Pendiente | Validar CORS por entorno. | Checklist QA |
| DEF-009 | 2026-05 | E2E HTTP | Suites preparadas no ejecutan sin DB QA. | Alta | Bloqueado | Configurar `DATABASE_URL_TEST`. | `backend_http_e2e.md` |

## 13.3 Métricas de Calidad del Software

| Característica ISO/IEC 25010 | Métrica propuesta | Evidencia actual | Estado |
|---|---|---|---|
| Adecuación funcional | Casos críticos aprobados / casos críticos totales. | Unit/service backend aprobados parcialmente. | Evidencia parcial |
| Eficiencia de desempeño | Tiempo de respuesta API, build time, carga catálogo. | No medido formalmente. | Pendiente |
| Compatibilidad | Builder bloquea combinaciones inválidas. | Tests parciales CPU/motherboard/RAM. | Evidencia parcial |
| Usabilidad | Formularios admin sin errores confusos; filtros URL. | Fixes de oferta, uploader, reset formulario. | Evidencia parcial |
| Fiabilidad | Stock no negativo, pagos manuales, snapshots precio. | Tests Orders/Payments. | Evidencia parcial |
| Seguridad | Auth por rol, token inválido, SQLi básica. | Tests auth/security. | Evidencia parcial |
| Mantenibilidad | Servicios/helpers extraídos, deuda documentada. | `ProductPricingService`, `buildProductPayload`, auditoría. | Implementado parcialmente |
| Portabilidad | Dockerfiles, Compose, `.env.example`. | `docker compose config` OK. | Preparado para QA/staging |

## 13.4 Evaluación de Calidad basada en Estándares

| Estándar | Aplicación en el proyecto | Evidencia | Nivel actual |
|---|---|---|---|
| ISO 9001 | Control documental, checklist, trazabilidad y proceso QA. | `docs/00` a `docs/13`. | Implementado parcialmente |
| ISO/IEC 25010 | Calidad de producto: funcionalidad, seguridad, mantenibilidad, portabilidad. | Plan de pruebas, métricas y build/typecheck. | Implementado parcialmente |
| ISO/IEC 27001 | Gestión segura de configuración, secretos fuera del repo, auth/roles. | `.env.example`, `.dockerignore`, tests auth. | Preparado / evidencia parcial |
| ISO/IEC 42001 | Gobernanza de IA asistiva, no autónoma. | Estado del arte, plan IA, runner controlado. | Pendiente de validación |
| CRISP-ML(Q) | Calidad en ciclo de vida ML: datos, modelo, evaluación, monitoreo. | Documentación de estado del arte e IA. | Pendiente de dataset/evaluación |

No se afirma certificación ni cumplimiento formal; se documenta alineación técnica y aplicación parcial.
