# Products And Form Refactor

| Area     | Funcion        | Estrategia aplicada                                          | Helpers creados                                                                                                                                                                                                      | Comportamiento preservado                                          | Estado    |
| -------- | -------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| Backend  | `create`       | Orquestador de validacion, payload, persistencia y auditoria | `buildCreateProductImages`, `validateCreateProductInput`, `buildCreateProductPayload`, `persistCreatedProduct`, `logProductCreationIfNeeded`                                                                         | Validaciones, imagenes, specs, slug/SKU, Prisma create y auditoria | Parcial   |
| Frontend | `handleChange` | Dispatcher por tipo de campo y casos especiales              | `shouldRejectFieldValue`, `restorePreviousFieldValue`, `handleCpuBrandChange`, `handleOfficeMouseChange`, `handleKeyboardTypeChange`, `handleHeadsetConnectionChange`, `handleCableHubTypeChange`, `updateFormField` | Estado `formData`, nombres de campos, valores y payload final      | Corregido |

## Pruebas realizadas

- Backend: `npm run build`
- Backend: `npm test`
- Backend: `npm run lint` sin errores, con warnings existentes.
- Frontend: `npm run build`
- Frontend: `npm run lint` sin errores, con warnings existentes.

## Riesgos pendientes

- `addSpecFilters` y `buildSpecUpdate` requieren una iteracion especifica con pruebas por categoria para preservar filtros Prisma y merges de specs.
- `buildCreateProductPayload` conserva el switch por categoria para no alterar estructura de specs; puede dividirse en builders por categoria cuando existan tests de creacion por categoria.
