# Limites de Logica de Negocio y Seguridad

## Principio de confianza cero hacia el frontend

El frontend no es una fuente confiable para precios, stock, permisos, metodos de pago ni creacion de pedidos, porque el usuario puede manipular el codigo del navegador, el estado React, `localStorage`, cookies visibles, requests HTTP y payloads enviados a la API.

Por esa razon, PCSystemStore usa el frontend para experiencia de usuario y el backend como autoridad final. Cualquier regla que afecte dinero, inventario, permisos, sesiones o estado de pedido debe existir en backend aunque tambien se muestre visualmente en frontend.

## Que puede vivir en frontend

- Mostrar u ocultar botones.
- Deshabilitar opciones para mejorar UX.
- Mostrar tooltips y mensajes como `No disponible`.
- Calcular subtotal, IGV y total visual aproximado.
- Mantener carrito local o anonimo.
- Validar formularios antes de enviar.
- Guiar compatibilidad en el configurador.
- Mostrar stock y disponibilidad.
- Redirigir a login si no hay sesion local.
- Sugerir productos desde Alex y agregarlos al carrito local.

Estas reglas no son barreras de seguridad. Si el usuario las manipula, el backend debe rechazar cualquier operacion invalida.

## Que debe vivir en backend

- Recalculo de precio efectivo desde productos persistidos.
- Recalculo de subtotal, IGV y total.
- Validacion final de stock.
- Validacion de cantidad minima y maxima.
- Validacion de metodo de pago.
- Limite Yape/Plin de S/. 500.
- Creacion de orden.
- Validacion de usuario autenticado para checkout.
- Validacion de owner de orden.
- Aprobacion/rechazo de pagos.
- Descuento de stock.
- Auditoria de acciones criticas.
- Validacion de roles y permisos admin.
- Validacion de datos de producto y ofertas.
- Validacion de uploads: tamano, cantidad y MIME permitido.

## Reglas criticas actuales

### Carrito anonimo

El carrito puede vivir en `localStorage` y puede ser usado sin login. Esto es aceptable porque no crea orden, no descuenta stock y no cobra. Al iniciar checkout, el backend recalcula todo.

### Checkout

El frontend redirige a `/auth/login?redirect=/checkout` si no hay cliente. El backend protege `POST /orders`, `POST /payments/simulate` y `POST /payments/manual` con `@Roles('CUSTOMER')`, por lo que un request directo sin token debe responder 401.

### Totales

El frontend muestra total visual desde el carrito. El backend no confia en ese total. `OrdersService.create` recibe solo `method` e `items`, busca productos reales, aplica `ProductPricingService`, calcula subtotal, IGV y total, y guarda snapshots.

### Stock

El frontend limita cantidad para UX. El backend valida stock al crear la orden y vuelve a validar al descontar stock en pago aprobado o aprobacion manual. El descuento usa `updateMany` con condicion `stock >= quantity` para evitar stock negativo.

### Yape y Plin

El frontend bloquea Yape/Plin sobre S/. 500 con `No disponible`. El backend aplica la regla obligatoria con `MANUAL_WALLET_PAYMENT_LIMIT = 500` en:

- Creacion de orden.
- Creacion de pago manual.
- Aprobacion de pago manual heredado.

Si el usuario fuerza `YAPE` o `PLIN` con total real mayor a S/. 500, backend responde 400.

### Pagos manuales

El frontend solo envia codigo de operacion y muestra estado. El backend decide si el pago queda pendiente, aprobado o rechazado. La aprobacion/rechazo se protege con rol admin y registra auditoria.

### Admin

El frontend puede ocultar pantallas o links segun rol, pero esto no es seguridad. El backend registra `JwtAuthGuard` y `RolesGuard` globales y cada endpoint admin declara `@Roles(...)`.

### Uploads de imagenes

El frontend puede mostrar recomendaciones de peso y formato, pero la validacion real de uploads vive en backend. Los endpoints con `memoryStorage()` definen `limits.fileSize`, limite de cantidad y `fileFilter` para aceptar solo `image/jpeg`, `image/png` y `image/webp`.

Politica actual:

- Productos: maximo 5 imagenes, 2 MB por imagen.
- Upload admin de imagen individual: maximo 1 archivo, 3 MB.
- Tipos permitidos: JPG, PNG y WEBP.

Si un usuario fuerza un archivo grande o con MIME no permitido, backend responde 400 y no envia el archivo a Cloudinary.

### Chatbot Alex

Alex puede agregar productos al carrito local sin login. Alex no crea orden, no procesa pagos y no descuenta stock. Si el usuario pide comprar, pagar o finalizar compra, el servicio de chatbot orienta a Mi Cesta/checkout.

### Configurador

El configurador valida compatibilidad en frontend para guiar al usuario y armar un carrito, pero la validacion final vive en backend. `POST /builder/validate` recibe IDs de productos, consulta specs reales en PostgreSQL via Prisma y devuelve `compatible`, `errors`, `warnings` y resumen de potencia.

Cuando el carrito contiene productos agregados desde el configurador, checkout envia `source: "builder"` al crear la orden. `OrdersService.create` llama internamente a `BuilderService.validateBuild` antes de crear la orden. Si `compatible=false`, backend responde 400 y no crea orden, no procesa pago y no descuenta stock.

Reglas backend actuales:

- Socket CPU + motherboard.
- Tipo de memoria RAM + motherboard.
- PSU con consumo estimado y margen de seguridad.
- Cooler compatible con socket/TDP de CPU.
- Gabinete compatible con factor de forma de motherboard.
- Longitud GPU contra gabinete.
- Storage M.2/NVMe contra soporte M.2 de motherboard.

El navegador no es confiable para sockets, TDP, compatibilidad, precios, stock ni totales. La metadata enviada desde frontend se ignora para decidir compra; solo se usan `productId` persistidos.

## Casos de prueba de seguridad

| Caso | Resultado esperado |
| --- | --- |
| Forzar `YAPE` con total real S/. 1000 | Backend responde 400. |
| Enviar total manipulado S/. 1 | Backend ignora total enviado y recalcula desde productos. |
| Enviar cantidad mayor al stock | Backend responde 400 por stock insuficiente. |
| Crear orden sin login | Backend responde 401. |
| Cliente llama endpoint admin | Backend responde 403. |
| Usuario manipula localStorage con rol admin | Frontend puede alterarse, backend responde 401/403 sin cookie admin valida. |
| Chatbot agrega producto al carrito sin login | Permitido, solo carrito local. |
| Chatbot intenta comprar/pagar | No procesa; orienta a Mi Cesta/checkout. |
| Pago manual aprobado | Backend descuenta stock dentro de transaccion y registra auditoria. |
| Checkout builder incompatible | Backend responde 400 antes de crear orden. |
| Subir PDF o EXE renombrado como imagen | Backend responde 400 por MIME no permitido. |
| Subir sexta imagen de producto | Backend responde 400 por limite de archivos. |

## Riesgos mitigados

- Manipulacion de precios en `localStorage`.
- Manipulacion de totales de checkout.
- Bypass de Yape/Plin por request manual.
- Creacion de pedidos anonimos.
- Acceso admin por cambios en localStorage.
- Descuento de stock desde frontend.
- Aprobacion de pagos sin auditoria.
- Stock negativo por concurrencia.

## Riesgos pendientes

- La compatibilidad del configurador ya tiene validacion backend, pero depende de metadata tecnica completa en productos.
- Las pruebas de expiracion real de cookies/JWT deben ejecutarse manualmente o con e2e.
- Conviene agregar pruebas e2e HTTP para 401/403 y bypass de Yape/Plin antes del despliegue cloud.
