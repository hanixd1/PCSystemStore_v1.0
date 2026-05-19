# Auditoria de Logica de Negocio en Frontend

Fecha: 2026-05-19

Alcance revisado:
- `frontend/app/checkout`
- `frontend/components/CartSidebar.tsx`
- `frontend/components/CartHydrator.tsx`
- `frontend/store/useCartStore.ts`
- `frontend/components/Chatbot.tsx`
- `frontend/app/builder`
- `frontend/app/admin`
- `frontend/app/auth`
- `frontend/app/mi-cuenta`
- `frontend/lib`
- `backend/src/orders`
- `backend/src/payments`
- `backend/src/products`
- `backend/src/auth`
- `backend/src/users`
- `backend/src/audit`
- `backend/src/idempotency`

## Hallazgos

| Archivo | Logica encontrada | Clasificacion | Riesgo | Accion recomendada | Estado |
| --- | --- | --- | --- | --- | --- |
| `frontend/store/useCartStore.ts` | Calcula precio efectivo desde `price`, `isOnSale` y `salePrice` al agregar al carrito local. | UX segura | El precio en localStorage puede manipularse, pero no debe ser usado como fuente final. | Mantener para UX. Backend recalcula precio real en `OrdersService` con `ProductPricingService`. | Corregido |
| `frontend/components/CartHydrator.tsx` | Hidrata carrito desde `localStorage`, normaliza precio y cantidad. | UX segura | Usuario puede editar localStorage. | Mantener. Backend valida IDs, stock, cantidad y precio al crear orden. | Corregido |
| `frontend/components/CartSidebar.tsx` | Muestra subtotal y limita cantidad visual a `MAX_CART_ITEM_QUANTITY`. | UX segura | Subtotal y cantidad pueden manipularse en navegador. | Mantener. `CreateOrderDto` limita cantidad y backend recalcula total. | Corregido |
| `frontend/app/checkout/page.tsx` | Calcula subtotal, IGV incluido y total visual. | UX segura | Total visual no es confiable. | Mantener solo como preview. Backend no recibe total y recalcula desde productos persistidos. | Corregido |
| `frontend/app/checkout/page.tsx` | Bloquea Yape/Plin si total visual > S/. 500 y muestra `No disponible`. | Validacion duplicada | El usuario puede forzar request manual. | Mantener para UX. Backend rechaza orden, pago manual y aprobacion manual si total real > S/. 500. | Corregido |
| `frontend/app/checkout/page.tsx` | Redirige a `/auth/login?redirect=/checkout` si no hay cliente. | Validacion duplicada | Usuario puede llamar API directo sin UI. | Mantener. Backend protege `POST /orders`, `POST /payments/simulate` y `POST /payments/manual` con `@Roles('CUSTOMER')`. | Corregido |
| `frontend/app/auth/login/page.tsx` | Persiste usuario cliente y respeta `redirect`. | UX segura | Si se borra carrito en login, rompe checkout anonimo. | No borrar carrito al iniciar sesion. | Corregido |
| `frontend/app/admin/layout.tsx` | Valida rol desde API y redirige a `/admin/login`; usa localStorage solo para UI. | Validacion duplicada | LocalStorage puede manipularse para mostrar UI. | Mantener como UX. Backend usa `JwtAuthGuard` y `RolesGuard` globales. | Corregido |
| `frontend/app/admin/pagos/page.tsx` | Muestra pagos manuales y botones aprobar/rechazar. | Validacion duplicada | Botones pueden llamarse directamente. | Mantener UI. Backend protege rutas admin y decide aprobacion/rechazo con auditoria y descuento de stock transaccional. | Corregido |
| `frontend/app/admin/add-product/page.tsx` | Valida formularios de producto, precio, stock, oferta y specs antes de enviar. | Validacion duplicada | Validaciones del navegador pueden omitirse. | Mantener para UX. Backend valida producto, oferta, stock y specs en `ProductsService`. | Corregido |
| `frontend/app/admin/edit-product/[id]/page.tsx` | Valida precio, oferta, stock y specs antes de actualizar. | Validacion duplicada | Usuario puede enviar payload manipulado. | Mantener para UX. Backend valida updates, registra auditoria de precio/oferta/stock. | Corregido |
| `frontend/lib/pricing.ts` | Calcula precio efectivo y porcentaje de descuento para render. | UX segura | No debe definir precio final de orden. | Mantener. Backend tiene `ProductPricingService`. | Corregido |
| `frontend/app/builder/page.tsx` | Filtra compatibilidad CPU/placa/RAM/storage/PSU/case y permite agregar piezas al carrito. | Riesgo pendiente | Si en el futuro se vende una configuracion como paquete o se bloquea compra por compatibilidad, el frontend no basta. | Mantener como guia. Si se habilita checkout de configuracion cerrada, crear validacion backend de compatibilidad antes de crear orden. | Pendiente |
| `frontend/lib/products/psuRecommendation.ts` | Calcula PSU recomendada para el configurador. | UX segura | Puede manipularse, pero hoy no aprueba compra ni crea pedido especial. | Mantener. No bloquear checkout por esta regla hasta que exista flujo backend de configuracion. | Pendiente |
| `frontend/components/Chatbot.tsx` | Agrega productos recomendados al carrito local y valida stock/cantidad para UX. | UX segura | Stock local puede quedar desactualizado. | Mantener. Backend valida stock al crear orden o aprobar pago. | Corregido |
| `ai-service/services/chatbot_service.py` | Detecta intentos de compra/pago y responde con orientacion a Mi Cesta. | UX segura | Si el bot procesara pedidos seria critico, pero no lo hace. | Mantener. Checkout y backend controlan login/pedido/pago. | Corregido |
| `frontend/app/mi-cuenta/*` | Protege vistas de cuenta en frontend y usa `/users/me*`. | Validacion duplicada | Rutas UI pueden manipularse. | Mantener. Backend protege rutas de cuenta con `@Roles('CUSTOMER')` y valida owner. | Corregido |
| `frontend/components/Header.tsx` | Muestra menus segun sesion local. | UX segura | No debe ser control de acceso. | Mantener como UI. Backend decide acceso real. | Corregido |

## Validaciones backend confirmadas

- `OrdersService.create` recalcula total desde productos reales, valida stock, cantidad, precio efectivo y limite Yape/Plin.
- `CreateOrderDto` valida `method`, `productId` UUID, `quantity` entero entre 1 y 10.
- `PaymentsService.createManual` valida owner de orden, estado, total persistido y limite Yape/Plin.
- `PaymentsService.approveManual` valida estado pendiente, limite Yape/Plin heredado, descuenta stock dentro de transaccion y registra auditoria.
- `PaymentsService.simulate` valida owner y descuenta stock solo si el pago simulado se aprueba.
- `ProductsService` valida precios, ofertas, stock y specs en create/update.
- `JwtAuthGuard` y `RolesGuard` estan registrados como guards globales.
- Rutas admin usan `@Roles(...)`.
- Rutas de checkout/pagos de cliente usan `@Roles('CUSTOMER')`.

## Cambios aplicados durante esta revision

- Se mantuvo la regla Yape/Plin en frontend como UX.
- Se confirmo y mantuvo la validacion backend obligatoria para Yape/Plin.
- Se confirmo que el backend no recibe ni confia en totales del frontend para crear orden.
- Se confirmo que el carrito anonimo no se elimina al iniciar sesion para volver a checkout.
- Se documento el riesgo pendiente de compatibilidad del configurador si se convierte en regla comercial obligatoria.

## Pendientes antes de despliegue

- Ejecutar pruebas manuales en navegador para hover/click de Yape/Plin sobre S/. 500.
- Ejecutar pruebas manuales de 401/403 con cookies vencidas o usuario sin rol.
- Definir si la compatibilidad del configurador sera regla vinculante de compra. Si lo sera, crear un endpoint backend de validacion de build antes de checkout.
