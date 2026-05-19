# Auditoria de Compatibilidad del Configurador

## Resumen

El configurador mantiene validaciones visuales en frontend para guiar la seleccion, pero la validacion que puede bloquear una compra se duplico en backend mediante `POST /builder/validate`. El backend recibe `productId`, consulta productos y especificaciones reales en la base de datos, y recalcula compatibilidad sin confiar en metadata enviada por el navegador.

## Reglas Encontradas

| Archivo | Regla encontrada | Actualmente en frontend/backend | Riesgo | Accion recomendada | Estado |
| --- | --- | --- | --- | --- | --- |
| `frontend/app/builder/page.tsx` | CPU y motherboard deben compartir socket. | Frontend y backend. | Un usuario podia manipular el estado React y agregar una combinacion incompatible. | Mantener como UX y validar en `BuilderService.validateBuild`. | Corregido |
| `frontend/app/builder/page.tsx` | RAM debe coincidir con tipo de memoria de la motherboard. | Frontend y backend. | Compra de DDR4 con placa DDR5 si se fuerza request. | Validar contra specs reales en backend. | Corregido |
| `frontend/app/builder/page.tsx` | Cooler debe soportar socket y TDP del CPU. | Frontend y backend. | Cooler incompatible podria llegar al checkout si se manipula frontend. | Validar sockets y TDP en backend, warning si falta metadata. | Corregido |
| `frontend/app/builder/page.tsx` | PSU debe cubrir consumo estimado. | Frontend y backend. | Fuente insuficiente si se evita filtro visual. | Recalcular CPU + GPU + margen de 20% en backend. | Corregido |
| `frontend/app/builder/page.tsx` | Storage M.2 requiere soporte M.2 en motherboard. | Frontend y backend. | Storage no compatible podria agregarse al carrito. | Validar slots y form factor M.2 en backend. | Corregido |
| `frontend/app/builder/page.tsx` | GPU debe caber en el gabinete. | Backend agregado; frontend no tenia filtro completo. | GPU demasiado larga podria llegar al checkout. | Validar `gpu.length` contra `case.maxGpuLength`. | Corregido |
| `frontend/app/builder/page.tsx` | Gabinete debe soportar factor de forma de motherboard. | Backend agregado; frontend no tenia filtro completo. | Motherboard y case incompatibles. | Validar metadata disponible en backend. | Corregido |
| `frontend/app/checkout/page.tsx` | Checkout de build debe identificarse como origen builder. | Frontend envia `source: "builder"` y backend valida. | Checkout normal no debe bloquearse; build incompatible si. | Marcar orden builder solo si hay items con `source: "builder"`. | Corregido |
| `backend/src/orders/orders.service.ts` | Creacion de orden debe bloquear build incompatible. | Backend. | Crear orden o pago con configuracion incompatible. | Llamar internamente `BuilderService.validateBuild` antes de crear orden. | Corregido |

## Reglas Backend Implementadas

- `CPU_MOTHERBOARD_SOCKET_MISMATCH`: socket de CPU y motherboard debe coincidir.
- `RAM_MOTHERBOARD_MEMORY_TYPE_MISMATCH`: RAM y motherboard deben compartir tipo DDR.
- `PSU_INSUFFICIENT_WATTAGE`: PSU debe cubrir consumo estimado con margen de seguridad.
- `COOLER_CPU_SOCKET_MISMATCH`: cooler debe soportar socket del CPU.
- `COOLER_TDP_INSUFFICIENT`: cooler debe cubrir TDP del CPU si la metadata existe.
- `CASE_MOTHERBOARD_FORM_FACTOR_MISMATCH`: gabinete y motherboard deben coincidir por factor de forma disponible.
- `GPU_CASE_LENGTH_EXCEEDED`: GPU no puede exceder longitud maxima del gabinete.
- `STORAGE_M2_NOT_SUPPORTED`: storage M.2/NVMe requiere slots M.2 en motherboard.
- `STORAGE_M2_FORM_FACTOR_MISMATCH`: motherboard debe soportar el tamano M.2 del storage.
- Metadata incompleta genera errores cuando es critica o warnings cuando la regla puede quedar como revision manual.

## Casos de Prueba

| Caso | Resultado esperado | Estado |
| --- | --- | --- |
| CPU AM5 + Motherboard AM5 | `compatible=true` | Automatizado |
| CPU LGA1700 + Motherboard AM5 | `compatible=false`, `CPU_MOTHERBOARD_SOCKET_MISMATCH` | Automatizado |
| RAM DDR4 + Motherboard DDR5 | `compatible=false`, `RAM_MOTHERBOARD_MEMORY_TYPE_MISMATCH` | Automatizado |
| PSU 400W con CPU+GPU de consumo superior | `compatible=false`, `PSU_INSUFFICIENT_WATTAGE` | Automatizado |
| Frontend manipulado envia build incompatible | Backend recalcula y rechaza. | Pendiente e2e |
| Checkout de configuracion incompatible | Backend responde 400 y no crea orden. | Automatizado en servicio |
| Compra de producto individual no-builder | No se bloquea por validacion de PC. | Cubierto por flujo existente |

## Riesgos Pendientes

- La calidad de la validacion depende de que los productos tengan metadata tecnica completa y normalizada.
- La regla de case form factor usa la metadata disponible actualmente; si se agrega `supportedFormFactors`, conviene migrar a lista de soportes.
- Falta prueba e2e HTTP que fuerce `source: "builder"` con productos incompatibles reales de seed.
