# Trazabilidad de Requisitos y Pruebas - PCSystemStore

## 1. Proposito

Este documento conecta requisitos funcionales, reglas de negocio, modulos, casos de prueba, normas relacionadas y evidencia esperada. Su objetivo es facilitar revision tecnica, QA y sustentacion academica. La evidencia queda marcada como **Pendiente de validacion** cuando no existe reporte ejecutado.

## 2. Matriz de trazabilidad

| RF/RN | Descripcion | Modulo | Casos de prueba | Norma relacionada | Evidencia esperada | Estado |
|---|---|---|---|---|---|---|
| RF-01 | Autenticacion y autorizacion separada para cliente, admin y editor. | Auth, Users, Admin | AUTH-01 a AUTH-09, SEC-01, SEC-04 | ISO/IEC 25010 seguridad; ISO/IEC 27001 control de acceso | Logs API, capturas login, respuestas 401/403 | Pendiente de validacion |
| RF-02 | Gestion CRUD de productos con validaciones tecnicas. | Products, Admin | PROD-01 a PROD-08 | ISO/IEC 25010 funcionalidad, mantenibilidad | Capturas admin, respuestas API, AuditLog | Pendiente de validacion |
| RF-03 | Catalogo publico con busqueda, categorias, detalle y filtros dinamicos por specs tecnicas. En CPU, los filtros publicos priorizan marca, socket, graficos integrados, precio, disponibilidad y oferta; TDP queda como especificacion tecnica y validacion interna del builder. En Motherboard, los filtros publicos priorizan marca, precio, plataforma, socket y formato; Tipo de RAM y Slots M.2 se conservan como specs y reglas de compatibilidad, pero no como filtros principales. En GPU, los filtros publicos priorizan marca ensambladora, precio, chipset, VRAM, disponibilidad y oferta; TDP/consumo queda como especificacion tecnica. | Frontend catalogo, Products API | CAT-01 a CAT-13, SEC-02, E2E-01, E2E-02 | ISO/IEC 25010 usabilidad, compatibilidad | Capturas catalogo, query params, logs API | Pendiente de validacion |
| RF-04 | Compatibilidad tecnica de componentes. | Builder, Products | BLD-01 a BLD-08 | ISO/IEC 25010 adecuacion funcional | Matriz builder ejecutada | Pendiente de validacion |
| RF-05 | Validacion de fuente de poder por consumo estimado. | Builder | BLD-06 | ISO/IEC 25010 fiabilidad | Caso PSU insuficiente/suficiente | Pendiente de validacion |
| RF-06 | Motor predictivo asistivo para riesgo de stockout. | AI, Python | AI-01 a AI-05 | CRISP-ML(Q), ISO/IEC 42001 alineacion | Reporte pytest/modelo, salida JSON | Pendiente de validacion |
| RF-07 | Alertas de productos criticos. | AI, Admin | AI-06, AI-07 | ISO/IEC 25010 funcionalidad | Capturas panel admin | Pendiente de validacion |
| RF-08 | Mensajes FOMO basados en stock o prediccion real. | Catalogo, AI | AI-06, SEC-02 | ISO/IEC 25010 usabilidad; etica IA | Evidencia de condicion de activacion | Pendiente de validacion |
| RF-09 | Feedback de usuario y errores controlados. | Frontend, API | AUTH-02, SALE-02, SEC-03 | ISO/IEC 25010 usabilidad | Capturas mensajes claros | Pendiente de validacion |
| RF-10 | Carrito asociado a sesion cliente y stock disponible. | Cart, Zustand | CART-01 a CART-03 | ISO/IEC 25010 fiabilidad | Capturas carrito, estado localStorage | Pendiente de validacion |
| RF-11 | Compra/checkout con orden, pago y descuento de stock. | Orders, Payments | CART-04 a CART-06, PAY-01 a PAY-04 | ISO/IEC 25010 funcionalidad, fiabilidad | Respuestas API, DB, AuditLog | Pendiente de validacion |
| RF-12 | Gestion de imagenes para producto, logo y banners. | Uploads, Branding | IMG-01 a IMG-06 | ISO/IEC 25010 usabilidad | Capturas preview/fallback, API upload | Pendiente de validacion |
| RF-13 | Ofertas gestionadas solo desde Editar Producto con `isOnSale` y `salePrice`; crear producto fuerza oferta desactivada. | Products, Pricing | SALE-01 a SALE-06 | ISO/IEC 25010 fiabilidad | Payload, DB, catalogo/detalle | Pendiente de validacion |
| RF-14 | Auditoria administrativa y de inventario. | Audit | AUD-01 a AUD-08 | ISO/IEC 27001 trazabilidad; IEEE 730 | Registros AuditLog | Pendiente de validacion |
| RF-15 | Pagos manuales/simulados sin pasarela real. | Payments, Orders | PAY-01 a PAY-05 | ISO/IEC 25010 seguridad, fiabilidad | Estados payment/order, stock | Pendiente de validacion |
| RF-16 | Branding y banners dinamicos. | Branding, Banners | BRD-01 a BRD-06 | ISO/IEC 25010 usabilidad | Header/home actualizados | Pendiente de validacion |
| RF-17 | Gestion de perfil de cliente. | Mi cuenta, Users | AUTH-01, pruebas perfil futuras | ISO/IEC 25010 usabilidad; ISO/IEC 27001 | Capturas mi cuenta, API profile | Pendiente de validacion |
| RF-18 | Pedidos del cliente autenticado. | Orders, Mi cuenta | CART-04, E2E-05 | ISO/IEC 25010 funcionalidad | Historial pedidos cliente | Pendiente de validacion |
| RF-19 | Chatbot/asistente IA. | Chatbot, AI | Pruebas chatbot futuras | ISO/IEC 42001 alineacion; ISO/IEC 25010 usabilidad | Conversaciones, fallback error | Pendiente de validacion |

## 3. Reglas de negocio trazables

| RN | Regla | Pruebas asociadas | Evidencia |
|---|---|---|---|
| RN-01 | No vender si stock es 0. | CART-02, CART-06 | Pendiente de validacion |
| RN-02 | Stock solo baja con pago aprobado. | PAY-02, PAY-03, PAY-04 | Pendiente de validacion |
| RN-03 | Cliente no accede a rutas admin. | AUTH-07, SEC-04 | Pendiente de validacion |
| RN-04 | Admin/editor no debe mezclarse con sesion cliente. | AUTH-04, AUTH-05 | Pendiente de validacion |
| RN-05 | Oferta es posterior a la creacion; Agregar Producto no configura oferta y crea con `salePrice=null`. | SALE-01, SALE-04, SALE-06 | Pendiente de validacion |
| RN-06 | Builder debe bloquear incompatibilidades criticas. | BLD-02 a BLD-07 | Pendiente de validacion |
| RN-07 | IA no toma decisiones autonomas. | AI-01 a AI-07 | Pendiente de validacion |
| RN-08 | `tdp` representa TDP maximo y sigue siendo usado por el armador; `baseTdpWatts` es solo informativo. | PROD-09, BLD-04 a BLD-06 | Pendiente de validacion |
| RN-09 | La marca de placa madre se registra en `MotherboardSpecs.brand`; es requerida al guardar Motherboard y se usa para filtros publicos sin duplicar con una marca global de producto. | PROD-10, CAT-12 | Pendiente de validacion |
| RN-10 | GPU separa `gpuPowerWatts` como consumo real usado por el armador y `recommendedPsuWatts` como piso minimo del fabricante; la PSU final recomendada usa el mayor valor aplicable. | PROD-11, CAT-13, BLD-06A | Pendiente de validacion |

## 4. Conclusiones

La trazabilidad cubre los modulos principales del sistema y permite justificar pruebas frente a requisitos funcionales y reglas de negocio. Antes de staging se deben ejecutar, evidenciar y firmar los casos criticos de autenticacion, stock, checkout, oferta, pagos y builder.
