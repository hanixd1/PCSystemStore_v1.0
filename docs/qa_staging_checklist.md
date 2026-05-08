# Checklist QA/Staging - PCSystemStore

Estados permitidos: `Pendiente`, `En ejecucion`, `Aprobado`, `Fallido`, `Bloqueado`.

> Regla QA: no marcar `Aprobado` sin evidencia real. Si falta ejecucion o captura/log/API, mantener `Pendiente`.

## Resumen de pruebas automatizadas ejecutadas

| Grupo | Cobertura ejecutada | Estado | Evidencia | Observaciones |
|---|---|---|---|---|
| Auth backend | AUTH-01 a AUTH-07 con servicios/guards mockeados. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente HTTP e2e real con base QA. |
| Productos/ofertas | PROD-02 a PROD-07 con `ProductsService` y Prisma mockeado. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente flujo UI/API real con imagenes. |
| Catalogo/filtros | Filtros por specs, precio, stock, oferta y paginacion con `ProductsService` mockeado. | Aprobado | `backend/src/products/products-filter.service.spec.ts` | Pendiente HTTP real y validacion visual. |
| Stock/checkout | STOCK-01, STOCK-02, STOCK-05, STOCK-06, STOCK-07 con `OrdersService`. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente pago aprobado y concurrencia real. |
| Pagos manuales | PAY-01 a PAY-07 con `PaymentsService`. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente HTTP real y validacion visual admin. |
| Auditoria | AUD-01, AUD-02, AUD-03, AUD-07 con `AuditService`. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente revision visual/API real del historial. |
| Seguridad | SEC-01 y SEC-06 con pruebas controladas backend/documentales. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente SQLi busqueda, XSS visual y CORS real. |
| IA | Error controlado de `AiPythonRunnerService` sin `predictor.py`. | Aprobado | `docs/evidencias/backend_unit_tests.md` | Pendiente ejecucion real del predictor y chatbot. |

## Fase 2 - HTTP E2E Backend

| Preparacion entorno QA/test | Estado | Evidencia | Observaciones |
|---|---|---|---|
| `backend/.env.test.example` creado | Aprobado | `backend/.env.test.example` | Plantilla sin secretos reales. |
| `.env.test` protegido en `.gitignore` | Aprobado | `backend/.gitignore` | Evita subir secretos QA. |
| Carga de `.env.test` en Jest E2E | Aprobado | `backend/test/setup-e2e.ts` | Asigna `DATABASE_URL=DATABASE_URL_TEST` si existe. |
| Script migraciones QA | Aprobado | `backend/scripts/run-prisma-test-deploy.js` | Bloquea si falta `DATABASE_URL_TEST`. |
| Seed QA protegido | Aprobado | `backend/prisma/seed-qa.ts` | Solo corre con `NODE_ENV=test` o confirmacion explicita. |
| `DATABASE_URL_TEST` real configurado | Bloqueado | `docs/evidencias/backend_http_e2e.md` | No existe en este entorno. |
| Migraciones QA/test ejecutadas | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere DB QA. |
| Seed QA ejecutado | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Requiere DB QA. |

| Suite | Casos | Estado | Evidencia | Observaciones |
|---|---|---|---|---|
| Auth HTTP real | AUTH-E2E-01 a AUTH-E2E-08 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |
| Productos/ofertas HTTP real | PROD-E2E-01 a PROD-E2E-09 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |
| Checkout/stock HTTP real | STOCK-E2E-01 a STOCK-E2E-06 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |
| Pagos manuales HTTP real | PAY-E2E-01 a PAY-E2E-09 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |
| Builder HTTP real | BUILD-E2E-01 a BUILD-E2E-07 | Bloqueado parcial | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`; endpoints de cooler/PSU/configuracion completa no existen aun. |
| Auditoria HTTP real | AUD-E2E-01 a AUD-E2E-08 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |
| Seguridad HTTP real | SEC-E2E-01 a SEC-E2E-06 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |
| Stock concurrente HTTP real | STOCK-CONC-E2E-01 | Bloqueado | `docs/evidencias/backend_http_e2e.md` | Falta `DATABASE_URL_TEST`. |

| ID | Modulo | Caso | Pasos | Resultado esperado | Estado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Auth | Cliente inicia sesion en `/auth/login`. | Abrir login cliente, ingresar usuario CUSTOMER valido, enviar formulario. | Login exitoso, token cliente guardado, header muestra usuario. | Pendiente | `docs/evidencias/auth/` | Pendiente de ejecucion manual/E2E. |
| AUTH-02 | Auth | Admin inicia sesion en `/admin/login`. | Abrir login admin, ingresar usuario ADMIN/EMPLOYEE valido. | Login exitoso y acceso al panel admin. | Pendiente | `docs/evidencias/auth/` | Pendiente de ejecucion manual/E2E. |
| AUTH-03 | Auth | Admin no entra desde `/auth/login` si no existe como cliente. | Intentar login cliente con credenciales admin. | Respuesta 403 o mensaje de cuenta no registrada como cliente; no guarda token cliente. | Pendiente | `docs/evidencias/auth/` | Critico. |
| AUTH-04 | Auth | Cliente no puede entrar desde `/admin/login`. | Intentar login admin con usuario CUSTOMER. | Respuesta 403 o mensaje sin permisos administrativos. | Pendiente | `docs/evidencias/auth/` | Critico. |
| AUTH-05 | Auth | Ruta `/admin` sin token devuelve 401/403 o redirige a login. | Abrir ruta admin en sesion limpia. | No permite acceso al panel. | Pendiente | `docs/evidencias/auth/` | Validar UI y endpoint. |
| AUTH-06 | Auth | Ruta admin con token cliente devuelve 401/403. | Usar sesion CUSTOMER e intentar acceder a admin. | Bloqueo por rol incorrecto. | Pendiente | `docs/evidencias/auth/` | Critico. |
| AUTH-07 | Auth | Token invalido o expirado no permite acceso. | Manipular token local o usar token vencido. | Sesion rechazada y redireccion controlada. | Pendiente | `docs/evidencias/auth/` | No exponer errores internos. |
| PROD-01 | Productos | Crear producto valido. | Crear producto con datos basicos, specs e imagen. | Producto creado y visible en admin/catalogo. | Pendiente | `docs/evidencias/productos/` | Requiere evidencia API/UI. |
| PROD-02 | Productos | Editar nombre/descripcion. | Editar producto existente. | Cambios persistidos y auditoria registrada. | Pendiente | `docs/evidencias/productos/` |  |
| PROD-03 | Productos | Editar precio normal. | Cambiar precio y guardar. | Precio se guarda exactamente, sin recalculo indebido. | Pendiente | `docs/evidencias/productos/` |  |
| PROD-04 | Productos | Editar stock. | Cambiar stock a 0 y a valor positivo. | Stock se guarda, 0 permitido, negativos bloqueados. | Pendiente | `docs/evidencias/stock/` |  |
| PROD-05 | Productos | Subir imagenes. | Subir 1 a 5 imagenes locales. | URLs generadas internamente y previews validos. | Pendiente | `docs/evidencias/productos/` |  |
| PROD-06 | Ofertas | Editar producto sin oferta no exige `salePrice`. | Desactivar oferta y editar stock/descripcion. | Guarda sin error de precio de oferta. | Pendiente | `docs/evidencias/ofertas/` | Critico por bug reciente. |
| PROD-06A | Ofertas | Agregar Producto no permite oferta inicial. | Crear producto nuevo, incluso si llega payload malicioso con `salePrice=0`. | Producto creado con `isOnSale=false` y `salePrice=null`. | Pendiente | `docs/evidencias/ofertas/` | Critico por bug reciente. |
| PROD-07 | Ofertas | Activar oferta exige `salePrice` valido. | Activar oferta sin precio o con <= 0. | Bloqueo con mensaje claro. | Pendiente | `docs/evidencias/ofertas/` |  |
| PROD-08 | Ofertas | `salePrice` menor que `price`. | Usar salePrice igual/mayor al precio normal. | Backend/frontend bloquean. | Pendiente | `docs/evidencias/ofertas/` |  |
| PROD-09 | Ofertas | Desactivar oferta guarda `isOnSale=false` y `salePrice=null`. | Producto con oferta activa, desactivar y recargar. | Oferta queda desactivada persistente. | Pendiente | `docs/evidencias/ofertas/` | Critico. |
| PROD-10 | Ofertas | Catalogo muestra precio normal si oferta esta desactivada. | Ver producto sin oferta en catalogo. | Muestra `price`, no `salePrice`. | Pendiente | `docs/evidencias/ofertas/` |  |
| PROD-11 | Ofertas | Catalogo muestra precio oferta si esta activa. | Activar oferta y revisar card/detalle. | Muestra `salePrice`, precio normal tachado/badge. | Pendiente | `docs/evidencias/ofertas/` |  |
| PROD-12 | Ofertas | Order usa `ProductPricingService`. | Crear pedido con/sin oferta y revisar snapshot. | `unitPriceSnapshot` usa precio efectivo vigente. | Pendiente | `docs/evidencias/checkout/` | Parcialmente cubierto por unit test de pricing. |
| CAT-01 | Catalogo | Filtrar CPU por marca AMD. | Abrir Procesadores y seleccionar AMD. | Solo se listan procesadores AMD. | Pendiente | `docs/evidencias/productos/` | Backend cubierto por unit test; falta UI/API real. |
| CAT-02 | Catalogo | Filtrar CPU por socket AM5. | Seleccionar socket AM5. | Solo se listan productos AM5. | Pendiente | `docs/evidencias/productos/` |  |
| CAT-03 | Catalogo | Filtrar por rango de precio. | Definir minPrice/maxPrice. | Resultados dentro del rango. | Pendiente | `docs/evidencias/productos/` |  |
| CAT-04 | Catalogo | Filtrar por stock y oferta. | Usar disponibilidad/oferta. | Resultados coinciden con stock/oferta. | Pendiente | `docs/evidencias/productos/` |  |
| CAT-05 | Catalogo | Combinacion de filtros. | Aplicar marca + socket + precio. | Interseccion correcta. | Pendiente | `docs/evidencias/productos/` |  |
| CAT-06 | Catalogo | Filtros en URL. | Aplicar filtros y recargar. | Query params conservan el estado. | Pendiente | `docs/evidencias/productos/` |  |
| STOCK-01 | Stock | Producto con stock 0 no permite compra. | Intentar agregar/comprar producto stock 0. | Boton bloqueado y backend no crea orden valida. | Pendiente | `docs/evidencias/stock/` | Critico. |
| STOCK-02 | Stock | Producto con stock > 0 permite carrito. | Agregar producto con stock disponible. | Item aparece en carrito. | Pendiente | `docs/evidencias/stock/` |  |
| STOCK-03 | Stock | Cantidad mayor al stock se bloquea. | Intentar superar stock disponible. | UI/backend bloquean. | Pendiente | `docs/evidencias/stock/` |  |
| STOCK-04 | Checkout | Checkout descuenta stock correctamente. | Crear orden y aprobar pago simulado. | Stock baja segun cantidad. | Pendiente | `docs/evidencias/checkout/` | Critico. |
| STOCK-05 | Stock | Stock nunca queda negativo. | Repetir compra o intentar cantidad excesiva. | Transaccion rechaza si no alcanza stock. | Pendiente | `docs/evidencias/stock/` | Pendiente prueba de concurrencia. |
| STOCK-06 | Checkout | Pedido guarda snapshot de precio. | Crear pedido y luego cambiar precio producto. | Pedido conserva precio original. | Pendiente | `docs/evidencias/checkout/` |  |
| STOCK-07 | Checkout | Producto en oferta usa `salePrice` en pedido. | Crear pedido con oferta activa. | Snapshot usa salePrice. | Pendiente | `docs/evidencias/checkout/` |  |
| STOCK-08 | Checkout | Producto sin oferta usa precio normal. | Crear pedido sin oferta. | Snapshot usa price. | Pendiente | `docs/evidencias/checkout/` |  |
| PAY-01 | Pagos | Pago Yape/Plin queda en revision. | Crear orden manual Yape/Plin. | Payment y order quedan `PENDING_REVIEW`. | Pendiente | `docs/evidencias/pagos/` |  |
| PAY-02 | Pagos | Pago pendiente no descuenta stock definitivo. | Revisar stock tras enviar codigo operacion. | Stock sin cambios hasta aprobacion admin. | Pendiente | `docs/evidencias/pagos/` | Critico. |
| PAY-03 | Pagos | Admin aprueba pago manual. | Aprobar desde admin pagos. | Payment `APPROVED`, order `PAID`. | Pendiente | `docs/evidencias/pagos/` |  |
| PAY-04 | Pagos | Al aprobar, stock baja correctamente. | Comparar stock antes/despues. | Baja exacta por items. | Pendiente | `docs/evidencias/pagos/` |  |
| PAY-05 | Pagos | Admin rechaza pago manual. | Rechazar payment pendiente. | Payment/order `REJECTED`. | Pendiente | `docs/evidencias/pagos/` |  |
| PAY-06 | Pagos | Al rechazar, stock no baja. | Comparar stock antes/despues. | Stock intacto. | Pendiente | `docs/evidencias/pagos/` |  |
| PAY-07 | Auditoria | Auditoria registra aprobacion/rechazo. | Revisar historial tras aprobar/rechazar. | Log visible en productos/inventario o pagos. | Pendiente | `docs/evidencias/auditoria/` |  |
| BUILD-01 | Builder | CPU AMD AM5 + motherboard AM5 valido. | Seleccionar CPU AM5 y board AM5. | Configuracion compatible. | Pendiente | `docs/evidencias/builder/` | Prioridad alta. |
| BUILD-02 | Builder | CPU AMD AM5 + motherboard AM4 invalido. | Seleccionar combinacion incompatible. | Bloqueo o mensaje de incompatibilidad. | Pendiente | `docs/evidencias/builder/` | Prioridad alta. |
| BUILD-03 | Builder | CPU Intel LGA1700 + motherboard AM5 invalido. | Seleccionar Intel + AM5. | Bloqueo por socket. | Pendiente | `docs/evidencias/builder/` | Prioridad alta. |
| BUILD-04 | Builder | RAM DDR4 + motherboard DDR5 invalido. | Seleccionar RAM/board incompatibles. | Bloqueo por tipo memoria. | Pendiente | `docs/evidencias/builder/` | Prioridad alta. |
| BUILD-05 | Builder | Cooler sin socket compatible invalido. | Seleccionar cooler sin socket CPU. | Bloqueo por socket. | Pendiente | `docs/evidencias/builder/` |  |
| BUILD-06 | Builder | Cooler maxTdp menor que CPU.tdp invalido. | Seleccionar cooler insuficiente. | Bloqueo por TDP. | Pendiente | `docs/evidencias/builder/` |  |
| BUILD-07 | Builder | PSU insuficiente invalida. | Seleccionar fuente menor al consumo estimado. | Bloqueo por watts. | Pendiente | `docs/evidencias/builder/` |  |
| BUILD-08 | Builder | Storage M.2 incompatible invalido. | Seleccionar SSD M.2 no soportado por board. | Bloqueo si aplica. | Pendiente | `docs/evidencias/builder/` |  |
| BUILD-09 | Builder | Configuracion completa valida permite avanzar. | Completar componentes compatibles. | Flujo permite continuar. | Pendiente | `docs/evidencias/builder/` |  |
| AUD-01 | Auditoria | Crear producto genera log. | Crear producto y revisar historial. | Log CREATE_PRODUCT. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-02 | Auditoria | Editar precio genera log anterior/nuevo. | Cambiar precio. | Log con old/new value. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-03 | Auditoria | Editar stock genera log anterior/nuevo. | Cambiar stock. | Log con stockBefore/stockAfter. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-04 | Auditoria | Cambiar imagen genera log. | Agregar/eliminar imagen. | Log de imagen. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-05 | Auditoria | Activar/desactivar oferta genera log. | Cambiar estado oferta. | Log de oferta. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-06 | Auditoria | Crear empleado genera log. | Crear empleado. | Log en seguridad/admin. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-07 | Auditoria | Modificar/desactivar empleado genera log. | Editar/desactivar empleado. | Log en seguridad/admin. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-08 | Auditoria | Venta/reduccion de stock genera log. | Completar compra aprobada. | Log de venta/stock. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-09 | Auditoria | Login de cliente no satura historial admin. | Login CUSTOMER y revisar historial. | No aparece LOGIN_USER cliente. | Pendiente | `docs/evidencias/auditoria/` |  |
| AUD-10 | Auditoria | Historial separa seguridad y productos/inventario. | Revisar tabs/secciones. | Eventos separados por dominio. | Pendiente | `docs/evidencias/auditoria/` |  |
| SEC-01 | Seguridad | SQL Injection en login. | Probar `' OR 1=1 --` en credenciales controladas. | No autentica, no error interno. | Pendiente | `docs/evidencias/seguridad/` | No destructivo. |
| SEC-02 | Seguridad | SQL Injection en busqueda. | Buscar `ryzen' OR '1'='1`. | Respuesta controlada, sin fuga de datos. | Pendiente | `docs/evidencias/seguridad/` | No destructivo. |
| SEC-03 | Seguridad | XSS en descripcion. | Crear/editar descripcion con script controlado. | Render escapa o bloquea script. | Pendiente | `docs/evidencias/seguridad/` | Usar ambiente QA. |
| SEC-04 | Seguridad | Cliente intenta endpoint admin. | Llamar endpoint admin con token cliente. | 403. | Pendiente | `docs/evidencias/seguridad/` |  |
| SEC-05 | Seguridad | Admin endpoint sin token. | Llamar endpoint admin sin Authorization. | 401/403. | Pendiente | `docs/evidencias/seguridad/` |  |
| SEC-06 | Seguridad | CORS por entorno. | Probar origen no permitido. | Rechazo o bloqueo CORS. | Pendiente | `docs/evidencias/seguridad/` |  |
| SEC-07 | Seguridad | No hay credenciales reales hardcodeadas. | Buscar secretos en codigo. | Sin credenciales reales expuestas. | Pendiente | `docs/evidencias/seguridad/` |  |
| IA-01 | IA | AiPythonRunnerService ejecuta script Python. | Ejecutar endpoint/predictor con datos validos. | JSON valido procesado. | Pendiente | `docs/evidencias/ia/` |  |
| IA-02 | IA | Falta dependencia Python da error controlado. | Simular dependencia faltante. | Backend responde sin caer. | Pendiente | `docs/evidencias/ia/` | Parcialmente cubierto por unit test de archivo faltante. |
| IA-03 | IA | Python devuelve JSON valido. | Ejecutar predictor correcto. | Backend responde data esperada. | Pendiente | `docs/evidencias/ia/` |  |
| IA-04 | IA | Python devuelve JSON corrupto. | Simular salida corrupta. | Error controlado, backend vivo. | Pendiente | `docs/evidencias/ia/` |  |
| IA-05 | IA | Timeout controlado. | Simular demora excesiva. | Timeout/mensaje controlado. | Pendiente | `docs/evidencias/ia/` | No implementado automaticamente. |
| IA-06 | IA | Chatbot responde sin romper tienda. | Consultar chatbot. | Respuesta controlada. | Pendiente | `docs/evidencias/ia/` |  |
| IA-07 | IA | IA no inventa stock/disponibilidad. | Preguntar por producto sin stock. | Respuesta basada en datos reales. | Pendiente | `docs/evidencias/ia/` |  |

## Decision operacional

| Condicion | Decision |
|---|---|
| Auth, stock, checkout, pagos, builder y seguridad criticos aprobados con evidencia | Habilitar QA/staging controlado. |
| Cualquier caso critico de auth, stock, checkout, pagos o seguridad fallido | Bloquear staging hasta corregir. |
| Casos documentales o visuales pendientes sin impacto critico | Permitir QA con observaciones si hay aprobacion tecnica. |
| Falta evidencia E2E/seguridad/stock concurrente | No habilitar produccion. |
