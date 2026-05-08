# Evidencias QA/Staging - PCSystemStore

## Proposito

Esta carpeta concentra evidencias de pruebas para validar el paso de PCSystemStore a un ambiente QA/staging controlado. Las evidencias deben demostrar el comportamiento real del sistema en autenticacion, productos, ofertas, stock, checkout, pagos manuales, builder, auditoria, seguridad e IA.

## Estructura

| Carpeta | Contenido esperado |
|---|---|
| `auth` | Capturas, respuestas API o logs de autenticacion cliente/admin. |
| `productos` | Evidencias de creacion, edicion, imagenes y especificaciones. |
| `ofertas` | Payloads, respuestas API y capturas de activacion/desactivacion de ofertas. |
| `stock` | Evidencias de bloqueo por stock 0, descuento y no-negatividad. |
| `checkout` | Evidencias de carrito, totales, pedidos y snapshots de precio. |
| `pagos` | Evidencias de pagos Yape/Plin pendientes, aprobados y rechazados. |
| `builder` | Evidencias de compatibilidad e incompatibilidad de componentes. |
| `auditoria` | Evidencias de logs administrativos y de inventario. |
| `seguridad` | Evidencias de pruebas controladas SQLi, XSS, CORS y auth. |
| `ia` | Evidencias del predictor Python, chatbot y errores controlados. |

## Como registrar una prueba

Cada evidencia debe identificar:

| Campo | Descripcion |
|---|---|
| ID de caso | Debe coincidir con `docs/qa_staging_checklist.md`. |
| Fecha | Fecha y hora de ejecucion. |
| Responsable | Persona que ejecuto la prueba. |
| Ambiente | Local, QA o staging. |
| Datos usados | Usuario, producto, pedido, payload o endpoint probado. |
| Resultado real | Respuesta observada. |
| Estado | Aprobado, Fallido, Bloqueado o Pendiente. |
| Archivo adjunto | Captura, log, JSON, CSV o reporte automatizado. |

## Evidencia manual

Incluye capturas de pantalla, videos cortos, respuestas copiadas de Postman/Insomnia, logs de consola o registros de base de datos. Debe indicar pasos reproducibles.

## Evidencia automatizada

Incluye salida de Jest, Supertest, Playwright, reportes de cobertura o logs CI. No se debe marcar una prueba como aprobada si solo existe el caso documentado pero no se ejecuto.

## Regla de trazabilidad

Todo archivo agregado en esta carpeta debe poder vincularse a un caso del checklist. Si no existe evidencia real, el estado debe permanecer como `Pendiente` o `Pendiente de validacion`.
