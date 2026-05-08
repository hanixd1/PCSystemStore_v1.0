# Auditoria Tecnica del Codigo Fuente

## 1. Resumen ejecutivo

El estado general del codigo es **aceptable con deuda tecnica relevante y riesgo medio**. El sistema cuenta con separacion frontend/backend, modulos NestJS, helpers frontend y entidades Prisma amplias. Sin embargo, se detecta concentracion de responsabilidades, archivos grandes, duplicacion entre formularios de producto, validaciones repartidas en frontend/backend y servicios backend con demasiada logica de dominio.

No se identifico evidencia de certificacion formal. La revision se basa en inspeccion local del repositorio y builds ejecutados recientemente.

## 2. Alcance de revision

| Carpeta | Alcance revisado |
|---|---|
| `backend/src` | Modulos `ai`, `audit`, `auth`, `branding`, `builder`, `orders`, `payments`, `products`, `uploads`, `users`, `utils`. |
| `backend/prisma` | `schema.prisma`, seed y migraciones existentes. |
| `frontend/app` | Rutas publicas, admin, builder, checkout, mi cuenta, producto y catalogo. |
| `frontend/components` | Header, carrito, chatbot, uploader, menu y cards. |
| `frontend/lib` | API, pricing, payload de productos, specs y sesion cliente. |
| `frontend/store` | Zustand para carrito. |
| Motor IA | Se detecto modulo backend `ai`; scripts Python externos quedan pendientes de revision profunda. |

## 3. Evidencia de comandos

| Comando | Resultado | Observacion |
|---|---|---|
| `npm run build` en `backend` | Exitoso | Ejecutado en revision reciente; Nest build compila. |
| `pnpm run build` en `frontend` | Exitoso | Ejecutado en revision reciente; Next build compila. |
| `npm run lint` | No ejecutado | El script backend usa `--fix`, podria modificar codigo. Recomendado ejecutarlo en rama separada. |
| `npx tsc --noEmit` | Pendiente de validacion | No existe script dedicado; build cubre TypeScript parcialmente. |
| `npx depcheck` | Pendiente de validacion | No instalado; requiere aprobacion/red para instalar o usar `npx`. |
| `npx ts-prune` | Pendiente de validacion | No instalado. |
| `npx jscpd frontend backend` | Pendiente de validacion | No instalado. |
| `npx madge --circular frontend/backend` | Pendiente de validacion | No instalado. |

## 4. Hallazgos por severidad

| ID | Severidad | Archivo/Modulo | Hallazgo | Impacto | Recomendacion |
|---|---|---|---|---|---|
| H-01 | Alta | `frontend/app/admin/add-product/page.tsx` | Archivo de aprox. 65 KB con UI, estado, validacion, payload e imagenes. | Dificulta mantenimiento y aumenta riesgo de regresion. | Extraer hooks, componentes por categoria y validadores. |
| H-02 | Alta | `backend/src/products/products.service.ts` | Servicio de aprox. 47 KB con CRUD, validacion, specs, auditoria y pricing. | Responsabilidad excesiva y cambios riesgosos. | Separar `ProductValidationService`, `ProductSpecsService`, `ProductAuditService`. |
| H-03 | Alta | `backend/src/ai/ai.service.ts` | Servicio de aprox. 43 KB concentrando logica IA/analisis. | Dificil de testear y aislar fallos IA. | Separar adapters Python, parsing, scoring y reportes. |
| H-04 | Media | `frontend/app/admin/edit-product/[id]/page.tsx` | Duplica gran parte de la logica de agregar producto. | Inconsistencias create/update. | Crear formulario reutilizable `ProductForm`. |
| H-05 | Media | Frontend/backend products | Validaciones de oferta, specs y numeros existen en UI y service. | Posibles divergencias. | Mantener backend como fuente de verdad y frontend como UX. |
| H-06 | Media | `backend/package.json` | Dependencias frontend (`react-slick`, `@react-oauth/google`) aparecen en backend. | Paquete backend inflado y responsabilidades mezcladas. | Revisar dependencias no usadas con depcheck. |
| H-07 | Media | Auditoria | Auditoria mejorada, pero pruebas reales pendientes. | Riesgo de trazabilidad incompleta. | Ejecutar casos AUD y verificar DB. |
| H-08 | Baja | Encoding visible | Algunas cadenas muestran mojibake en terminal (`EspaÃ±ol`, `MecÃ¡nico`). | Puede afectar UX si se renderiza mal. | Normalizar UTF-8 controladamente. |

## 5. Codigo spaghetti

| Archivo | Problema | Por que es spaghetti | Refactor sugerido |
|---|---|---|---|
| `frontend/app/admin/add-product/page.tsx` | Contiene constantes, estado, validacion, render condicional por categoria, upload y submit. | Mezcla UI + reglas + API + transformacion de datos. | Dividir en `ProductForm`, `useProductForm`, `CategorySpecsFields`, `productValidators`. |
| `frontend/app/admin/edit-product/[id]/page.tsx` | Repite campos y reglas de add-product. | Dos fuentes para la misma logica. | Reutilizar un unico formulario create/edit. |
| `backend/src/products/products.service.ts` | CRUD, specs, auditoria, pricing y validaciones en un servicio. | Cambios en una regla pueden romper varias rutas. | Servicios por responsabilidad y pruebas unitarias. |
| `backend/src/ai/ai.service.ts` | Logica IA extensa en un unico archivo. | Dificil aislar errores del motor predictivo. | Adapter Python, DTO de salida, validadores y monitor separados. |

## 6. Archivos duplicados o sospechosos

| Archivo A | Archivo B | Similitud/Problema | Accion sugerida |
|---|---|---|---|
| `frontend/app/admin/add-product/page.tsx` | `frontend/app/admin/edit-product/[id]/page.tsx` | Campos de especificaciones, imagenes y validaciones similares; oferta debe permanecer solo en edicion. | Crear componente compartido sin reintroducir oferta en creacion. |
| `frontend/lib/pricing.ts` | `backend/src/products/products.service.ts` / `backend/src/orders/orders.service.ts` | `getEffectivePrice` existe en frontend y backend. | Mantener backend como fuente de verdad y documentar helper frontend solo visual. |
| Formularios admin | DTO backend | Validaciones duplicadas parcialmente. | Centralizar reglas criticas en backend y generar mensajes frontend desde schema propio. |

## 7. Funciones duplicadas

| Funcion | Archivos donde aparece | Problema | Refactor sugerido |
|---|---|---|---|
| `getEffectivePrice` | `frontend/lib/pricing.ts`, `backend/src/products/products.service.ts`, `backend/src/orders/orders.service.ts` | Reglas de precio pueden divergir. | Crear modulo backend comun y tests; frontend solo para presentacion. |
| Validaciones de oferta | Edit product, ProductsService update, pricing | Riesgo de reintroducir `salePrice` en creacion si no se separa modo create/edit. | Mantener Agregar Producto sin oferta y validar oferta solo en edicion. |
| Validaciones de specs | Add/edit product y ProductsService | UI y backend no siempre tienen la misma matriz. | Crear tabla declarativa por categoria. |

## 8. Responsabilidades mezcladas

| Archivo | Responsabilidades mezcladas | Riesgo | Refactor sugerido |
|---|---|---|---|
| `products.service.ts` | Persistencia, reglas, auditoria, normalizacion, specs. | Alto | Servicios especializados por dominio. |
| `add-product/page.tsx` | UI, estado, validacion, payload, upload. | Alto | Hook + componentes por seccion. |
| `edit-product/[id]/page.tsx` | Fetch, mapping de specs, validacion, upload, render. | Medio | `useEditableProduct` + `ProductForm`. |
| `ai.service.ts` | Orquestacion IA, parsing y logica de negocio. | Medio | Adapter y capa de servicio. |

## 9. Codigo muerto o no usado

| Archivo/funcion/import | Evidencia | Accion |
|---|---|---|
| Dependencias frontend en backend | `backend/package.json` incluye `react-slick`, `slick-carousel`, `@react-oauth/google`. | Validar con depcheck antes de retirar. |
| Categorias antiguas | Se observaron bloques tipo `MOUSE_OLD`/`CHAIR_OLD` en add-product. | Confirmar si son legacy; eliminar si no se usan. |
| Imports no usados | Pendiente de lint sin `--fix`. | Ejecutar ESLint en rama separada. |

## 10. Dependencias y configuracion

| Elemento | Observacion | Recomendacion |
|---|---|---|
| `backend/package.json` | Backend contiene dependencias de UI. | Revisar depcheck. |
| `frontend/package.json` | Stack moderno Next 16/React 19. | Mantener builds como control obligatorio. |
| `.env.example` | Existe y ha sido ajustado en cambios previos. | Verificar JWT, CORS, DB, Cloudinary y API URL antes de staging. |
| `schema.prisma` | Modelo amplio con muchas relaciones por specs. | Mantener migraciones revisadas y seeds idempotentes. |
| `next.config` | Pendiente de revision profunda. | Validar dominios de imagen y cache de banners. |

## 11. Riesgos tecnicos

| Riesgo | Impacto | Probabilidad | Mitigacion |
|---|---|---|---|
| Regresion en productos por formularios duplicados | Alta | Alta | Formulario unico y tests. |
| Divergencia pricing frontend/backend | Alta | Media | Backend recalcula y tests de orden. |
| Deuda en ProductsService | Alta | Alta | Refactor por fases. |
| Falta de pruebas automatizadas | Alta | Alta | Priorizar auth, stock, checkout y oferta. |
| Encoding inconsistente | Media | Media | Normalizar UTF-8 en textos visibles. |
| IA sin evidencia de precision | Media | Alta | Evaluacion CRISP-ML(Q) y dataset versionado. |

## 12. Conclusion

El proyecto puede continuar hacia QA/staging **solo despues de ejecutar pruebas criticas** de auth, stock, ofertas, checkout, pagos manuales, builder y auditoria. Para produccion, se recomienda refactor previo en formularios de producto y `ProductsService`, ademas de pruebas automatizadas minimas. El codigo es funcionalmente amplio, pero requiere control de deuda tecnica antes de crecer mas.
