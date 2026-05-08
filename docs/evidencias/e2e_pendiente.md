# Evidencia pendiente - Pruebas E2E visuales

## Estado

Pendiente de configuracion. No se ejecuto Playwright/Cypress en esta fase porque el frontend actualmente no tiene runner E2E configurado ni script de test asociado.

## Motivo de no ejecucion

Configurar Playwright implica agregar dependencias, scripts, navegadores y posiblemente datos seed/controlados. Para esta fase se priorizo evidencia backend/API con Jest y mocks, evitando cambios de infraestructura que pudieran introducir ruido o romper el build estable.

## Flujos E2E que deben probarse luego

| ID | Flujo | Prioridad |
|---|---|---|
| E2E-AUTH-01 | Cliente login `/auth/login`, header muestra usuario y logout limpia carrito. | Alta |
| E2E-AUTH-02 | Admin login `/admin/login`, cliente no entra al admin. | Alta |
| E2E-PROD-01 | Admin crea producto con imagenes y specs, aparece en catalogo. | Alta |
| E2E-OFFER-01 | Activar/desactivar oferta desde admin y validar catalogo/detalle/carrito. | Alta |
| E2E-CHECKOUT-01 | Cliente agrega producto, checkout, pago simulado aprobado y stock baja. | Critica |
| E2E-PAY-01 | Yape/Plin pendiente, aprobacion admin y descuento de stock. | Critica |
| E2E-BUILDER-01 | Builder bloquea CPU/motherboard incompatible. | Alta |
| E2E-SEC-01 | XSS en descripcion no ejecuta script en navegador. | Critica |

## Comando recomendado futuro

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
pnpm exec playwright test
```

## Recomendacion

Configurar Playwright en una rama/fase separada, con seed de QA y datos deterministicos para evitar pruebas fragiles.
