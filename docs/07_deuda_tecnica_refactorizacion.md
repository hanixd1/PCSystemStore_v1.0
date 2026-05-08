# Deuda Tecnica y Plan de Refactorizacion

## 1. Introduccion

La deuda tecnica no es necesariamente negativa cuando permite avanzar, pero debe ser visible, priorizada y controlada. En PCSystemStore la deuda principal proviene de crecimiento funcional rapido: productos, specs, imagenes, auditoria, pagos y builder evolucionaron dentro de archivos grandes y con duplicacion entre flujos de crear/editar. La oferta queda definida como flujo posterior exclusivo de Editar Producto.

## 2. Deuda tecnica detectada

| ID | Area | Deuda | Impacto | Prioridad |
|---|---|---|---|---|
| DT-01 | Frontend admin | `add-product/page.tsx` demasiado grande. | Regresiones frecuentes. | Alta |
| DT-02 | Frontend admin | `edit-product/[id]/page.tsx` duplica logica de add. | Inconsistencia create/update. | Alta |
| DT-03 | Backend products | `products.service.ts` concentra demasiadas responsabilidades. | Baja mantenibilidad. | Alta |
| DT-04 | Backend AI | `ai.service.ts` extenso. | Dificil test y monitoreo. | Media |
| DT-05 | Pricing | `getEffectivePrice` duplicado. | Riesgo de precios inconsistentes. | Alta |
| DT-06 | Validaciones | Reglas duplicadas en frontend/backend. | Mensajes y reglas divergentes. | Alta |
| DT-07 | Dependencias | Posibles dependencias no usadas en backend. | Paquetes innecesarios. | Media |
| DT-08 | Encoding | Cadenas con mojibake en algunos archivos. | Riesgo UX/documentacion. | Media |
| DT-09 | Tests | Falta de suite automatizada suficiente. | Riesgo alto en cambios. | Alta |

## 3. Refactorizaciones prioritarias

| Prioridad | Refactor | Justificacion |
|---|---|---|
| 1 | Separar logica de formularios de productos. | Reduce duplicacion y errores en specs/ofertas. |
| 2 | Crear hooks reutilizables para create/edit product. | Centraliza mapping, validacion y payload. |
| 3 | Mover validaciones criticas al backend como fuente de verdad. | Evita bypass por Postman/API. |
| 4 | Unificar carga de imagenes. | Mismo flujo para logo, banners y productos. |
| 5 | Mantener logica de ofertas fuera de Agregar Producto. | Evita errores `salePrice`/`isOnSale` durante creacion. |
| 6 | Separar auditoria por dominio. | Facilita trazabilidad y pruebas. |
| 7 | Crear helpers declarativos para specs tecnicas. | Evita condicionales dispersos. |
| 8 | Reducir `page.tsx` grandes. | Mejor mantenibilidad y testabilidad. |
| 9 | Centralizar llamadas API. | Manejo uniforme de errores y auth. |
| 10 | Eliminar imports/dependencias no usadas. | Reduce complejidad. |
| 11 | Crear tests alrededor de logica critica antes de refactorizar. | Refactor seguro. |

## 4. Plan por fases

| Fase | Objetivo | Actividades |
|---|---|---|
| Fase 1 | Estabilizar bugs criticos | Oferta, stock, auth, CORS, checkout, pagos manuales. |
| Fase 2 | Extraer logica duplicada | ProductForm, hooks y helpers de specs. |
| Fase 3 | Centralizar validaciones | DTO/service backend y validadores frontend de UX. |
| Fase 4 | Agregar pruebas automatizadas | Unitarias pricing/specs, API auth/products/orders, E2E criticos. |
| Fase 5 | Limpiar dependencias | depcheck, ts-prune, madge y ESLint sin `--fix` automatico. |
| Fase 6 | Preparar staging | Variables entorno, seed QA, health checks y evidencias. |

## 5. Tabla de acciones

| Accion | Archivo/Modulo | Prioridad | Riesgo | Evidencia de cierre |
|---|---|---|---|---|
| Crear `ProductForm` reutilizable | `frontend/app/admin/*product*` | Alta | Medio | Add/edit usan el mismo componente. |
| Extraer `useProductForm` | Frontend admin | Alta | Medio | Hook con tests de payload. |
| Crear `ProductSpecsFields` | Frontend admin | Alta | Medio | Componentes por categoria. |
| Separar `ProductValidationService` | Backend products | Alta | Medio | Tests unitarios DTO/service. |
| Separar `ProductAuditService` | Backend products/audit | Media | Bajo | Eventos auditados igual que antes. |
| Centralizar pricing backend | Products/Orders | Alta | Bajo | Test `isOnSale=false/true`. |
| Crear pruebas de stock transaccional | Orders/Payments | Alta | Medio | Test evita stock negativo. |
| Ejecutar depcheck/ts-prune | Root | Media | Bajo | Reporte adjunto. |
| Normalizar encoding | Frontend/backend textos visibles | Media | Medio | Capturas sin mojibake. |

## 6. Reglas para refactor seguro

| Regla | Aplicacion |
|---|---|
| No cambiar comportamiento sin test | Crear pruebas antes de extraer logica critica. |
| Refactor pequeno | Evitar commits grandes mezclados. |
| Commits separados | Bugfix, refactor y formato por separado. |
| Validar build | `npm run build` backend y `pnpm run build` frontend. |
| Validar flujo manual | Admin producto, catalogo, carrito y checkout. |
| Documentar cambios | Actualizar docs si cambia arquitectura. |
| Mantener rollback | No borrar codigo legacy sin evidencia. |

## 7. Conclusion

Conviene refactorizar antes de produccion, especialmente formularios de producto, pricing/ofertas y `ProductsService`. Para QA/staging se puede avanzar si primero se ejecutan pruebas criticas y se documentan evidencias. El refactor debe ser incremental y protegido por pruebas para no romper flujos ya estabilizados.
