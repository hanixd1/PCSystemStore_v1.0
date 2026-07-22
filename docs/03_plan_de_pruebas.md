# Plan de Pruebas de Software - PCSystemStore

## 1. Resumen ejecutivo

Este plan define la estrategia para validar PCSystemStore en sus flujos criticos: autenticacion cliente/admin, CRUD de productos, especificaciones tecnicas, configurador de compatibilidad, carrito, checkout, pagos simulados/manuales, stock, auditoria, branding/banners, imagenes, chatbot, IA predictiva y seguridad. Las pruebas descritas quedan **Pendientes de ejecucion** hasta adjuntar evidencia real.

## 2. Alcance de pruebas

### 2.1 Elementos a probar

| Area | Elementos |
|---|---|
| Auth | Login cliente/admin, roles, JWT, rutas protegidas. |
| Productos | CRUD, specs, imagenes, ofertas, stock y auditoria. |
| Builder | Compatibilidad CPU, motherboard, RAM, PSU, cooler, storage y case. |
| Compra | Carrito, checkout, ordenes, pagos simulados/manuales y stock. |
| Admin | Editores, auditoria, pagos pendientes, branding y banners. |
| IA | Predictor Python, salida JSON, errores controlados y alertas. |
| Seguridad | SQLi, XSS, CORS, env, acceso directo a endpoints. |
| Frontend | Responsive, fallback de imagenes, UX de errores. |
| Catalogo | Filtros por precio, stock, oferta, categoria y especificaciones tecnicas por tipo. |

### 2.2 Elementos fuera de prueba

| Elemento | Motivo |
|---|---|
| Pasarela bancaria real | Fuera de alcance; pagos simulados/manuales. |
| SUNAT | No implementado. |
| Tracking GPS | No implementado. |
| Infraestructura interna Cloudinary | Solo se prueba integracion propia. |
| Pruebas masivas de produccion | Requieren ambiente productivo real. |

## 3. Estrategia de pruebas

| Tipo | Objetivo | Herramienta sugerida | Estado |
|---|---|---|---|
| Unitarias | Validar funciones puras, pricing, compatibilidad y DTOs. | Jest/Vitest | Pendiente |
| Integracion | Validar NestJS + Prisma + DB test. | Jest + Supertest | Pendiente |
| API | Validar endpoints auth, productos, pagos, usuarios, banners. | Postman/Insomnia | Pendiente |
| E2E | Validar flujos navegador completos. | Playwright | Pendiente |
| Seguridad | SQLi, XSS, auth bypass, CORS. | Postman + scripts | Pendiente |
| Regresion | Confirmar que fixes no rompen modulos previos. | Playwright + checklist | Pendiente |
| Rendimiento | Latencia home/catalogo/API y carga inicial. | Lighthouse/k6 | Pendiente |
| IA | Validar predictor, errores y datos faltantes. | pytest | Pendiente |
| Usabilidad | Formularios admin y cliente. | Checklist manual | Pendiente |
| Auditoria | Registro de acciones criticas. | DB/API + UI | Pendiente |
| Filtros catalogo | Validar query params, opciones dinamicas, paginacion y combinacion de filtros. | Jest + API + UI | Pendiente |

## 4. Herramientas recomendadas

| Herramienta | Uso |
|---|---|
| Jest o Vitest | Unitarias frontend/backend. |
| Supertest | Pruebas API NestJS. |
| Playwright | Flujos E2E. |
| Postman/Insomnia | Pruebas manuales y colecciones API. |
| pytest | Motor predictivo Python. |
| Prisma test DB | Base aislada de pruebas. |
| GitHub Actions | CI. |
| ESLint/Prettier | Calidad estatica y formato. |
| depcheck | Dependencias no usadas. |
| ts-prune | Exportaciones no usadas. |
| jscpd | Duplicacion. |
| madge | Dependencias circulares. |
| SonarQube/SonarCloud | Analisis continuo, si aplica. |

## 5. Criterios de aceptacion

| Criterio | Estado requerido |
|---|---|
| Errores criticos | 0 abiertos. |
| Rutas admin | Protegidas por JWT y rol. |
| Cliente/admin | Sesiones y logins separados. |
| Stock | Nunca negativo. |
| Oferta | Exclusiva de Editar Producto; los productos nuevos se crean con `isOnSale=false` y `salePrice=null`. |
| Pago manual | Descuenta stock solo al aprobar. |
| Builder | Bloquea incompatibilidades criticas. |
| IA | Falla de forma segura. |
| Banners | Solo activos visibles. |
| Imagenes | Cargan o muestran fallback. |

## 6. Criterios de suspension

| Causa | Accion |
|---|---|
| Caida del backend | Suspender ejecucion y revisar logs. |
| Corrupcion de BD | Restaurar backup o DB test. |
| Perdida de stock | Bloquear pruebas de compra. |
| Bypass auth | Prioridad critica. |
| Error checkout | Suspender E2E compra. |
| Venta sin stock | Bloqueo de staging. |
| Mezcla cliente/admin | Bloqueo de seguridad. |

## 7. Criterios de reanudacion

| Condicion | Evidencia |
|---|---|
| Bug corregido | Commit o diff revisado. |
| Smoke test exitoso | Captura/log. |
| Migraciones aplicadas | `prisma migrate status`. |
| Logs sin errores criticos | Log backend/frontend. |
| Rollback o fix validado | Resultado de regresion. |

## 8. Ambientes de prueba

| Ambiente | Uso | Estado |
|---|---|---|
| Local | Desarrollo y smoke test. | Disponible |
| QA/Staging | Validacion preproductiva. | Pendiente de validacion |
| Produccion futura | Operacion real. | Fuera de alcance actual |

## 9. Datos de prueba

| Dataset | Proposito | Ejemplo |
|---|---|---|
| CPU AMD/Intel | Compatibilidad socket. | Ryzen AM5, Intel LGA1700 |
| Motherboards | Validar sockets y RAM. | AM4, AM5, LGA1700, DDR4/DDR5 |
| RAM | Compatibilidad memoria. | DDR4 3200, DDR5 5200 |
| PSU | Consumo suficiente/insuficiente. | 450W, 650W, 850W |
| Productos sin stock | Bloqueo compra. | Stock 0 |
| Productos con oferta | Pricing. | `isOnSale=true`, `salePrice<price` |
| Pagos manuales | Revision admin. | Yape/Plin PENDING_REVIEW |
| Usuarios | Auth. | Cliente, admin, editor |

## 10. Evidencias esperadas

| Evidencia | Fuente |
|---|---|
| Capturas | Navegador local/QA. |
| Logs backend | Terminal NestJS. |
| Resultados API | Postman/Insomnia. |
| Reporte Playwright | HTML/trace. |
| Reporte unit tests | Jest/Vitest. |
| Cobertura | Jest coverage. |
| SQLi | Coleccion/API logs. |
| Auditoria | UI admin + tabla AuditLog. |
| Revision codigo | `06_auditoria_codigo.md`. |
