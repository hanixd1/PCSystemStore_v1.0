# Evidencia - Pruebas Unitarias Backend

## Datos generales

| Campo | Valor |
|---|---|
| Fecha | 2026-05-07 |
| Ambiente | Local |
| Responsable | QA Lead / Senior Tech Lead |
| Comando | `npm test -- --runInBand` |
| Ubicacion | `backend` |

## Resultado

```text
Test Suites: 11 passed, 11 total
Tests:       37 passed, 37 total
Snapshots:   0 total
```

## Cobertura funcional de esta evidencia

| ID interno | Area | Validacion |
|---|---|---|
| UNIT-PRICE-01 | Ofertas/precio | Usa precio normal cuando oferta esta desactivada. |
| UNIT-PRICE-02 | Ofertas/precio | Usa `salePrice` cuando la oferta esta activa y es valida. |
| UNIT-PRICE-03 | Ofertas/precio | Normaliza oferta desactivada como `salePrice=null`. |
| UNIT-PRICE-04 | Ofertas/precio | Rechaza oferta activa sin precio mayor a 0. |
| UNIT-PRICE-05 | Ofertas/precio | Rechaza oferta activa con `salePrice >= price`. |
| UNIT-BUILD-01 | Builder | Filtra motherboards por socket del CPU. |
| UNIT-BUILD-02 | Builder | Filtra RAM por tipo de memoria de la motherboard. |
| UNIT-IA-01 | IA | Error controlado cuando no existe `predictor.py`. |
| UNIT-APP-01 | Backend base | `AppController` compila con dependencias mockeadas. |
| AUTH-01 | Auth | Cliente con rol CUSTOMER puede autenticarse por flujo cliente. |
| AUTH-02 | Auth | Admin con rol ADMIN puede autenticarse por flujo admin. |
| AUTH-03 | Auth | Admin es rechazado en flujo cliente. |
| AUTH-04 | Auth | Cliente es rechazado en flujo admin. |
| AUTH-05 | Auth | Ruta protegida sin token genera `UnauthorizedException`. |
| AUTH-06 | Auth | Rol CUSTOMER en ruta ADMIN genera `ForbiddenException`. |
| AUTH-07 | Auth | Token invalido genera `UnauthorizedException`. |
| SEC-01 | Seguridad | Payload SQLi en login no autentica. |
| PROD-02 | Productos | Editar stock/precio sin oferta no exige `salePrice`. |
| PROD-04 | Ofertas | Activar oferta con `salePrice` valido. |
| PROD-05 | Ofertas | Rechazar `salePrice >= price`. |
| PROD-06 | Ofertas | Desactivar oferta genera `isOnSale=false` y `salePrice=null`. |
| PROD-07 | Ofertas | Editar producto sin oferta no exige `salePrice`. |
| STOCK-01 | Stock | Producto con stock 0 no permite orden. |
| STOCK-02 | Stock | Producto con stock disponible permite orden. |
| STOCK-05 | Stock | Cantidad mayor al stock se bloquea. |
| STOCK-06 | Checkout | Producto con oferta activa usa `salePrice` en snapshot. |
| STOCK-07 | Checkout | Producto sin oferta usa precio normal. |
| PAY-01 | Pagos manuales | Pago Yape/Plin queda `PENDING_REVIEW`. |
| PAY-02 | Pagos manuales | Pago pendiente no descuenta stock. |
| PAY-03 | Pagos manuales | Aprobar pago marca payment `APPROVED`. |
| PAY-04 | Pagos manuales | Aprobar pago marca order `PAID`. |
| PAY-05 | Pagos manuales | Aprobar pago descuenta stock. |
| PAY-06 | Pagos manuales | Rechazar pago marca `REJECTED`. |
| PAY-07 | Pagos manuales | Rechazar pago no descuenta stock. |
| AUD-01 | Auditoria | Log de creacion/accion de producto incluye actor y entidad. |
| AUD-02 | Auditoria | Log incluye valor anterior/nuevo. |
| AUD-03 | Auditoria | Log incluye stock anterior/posterior. |
| AUD-07 | Auditoria | Consulta administrativa filtra login/register de clientes. |
| SEC-06 | Seguridad | `.env.example` no coincide con patrones basicos de secretos reales. |

## Alcance y limitaciones

Estas pruebas validan logica aislada y de integracion con mocks. No sustituyen pruebas E2E, pruebas contra base de datos real, ni pruebas manuales de UI. Los flujos completos de navegador, CORS real, XSS visual y concurrencia de stock permanecen pendientes.
