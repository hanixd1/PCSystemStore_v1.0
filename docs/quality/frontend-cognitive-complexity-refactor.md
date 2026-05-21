# Frontend Cognitive Complexity Refactor

| Archivo                                         | Funcion marcada                | Estrategia aplicada                                             | Helpers/componentes extraidos                                                                                                                                       | Comportamiento preservado                                                              |
| ----------------------------------------------- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `frontend/app/admin/banners/page.tsx`           | `AdminBannersPage`             | Se extrajo armado y persistencia de banner fuera del componente | `sortBannersByOrder`, `buildBannerPayload`, `saveBanner`                                                                                                            | Carga, creacion, edicion, eliminacion, toggle, imagenes, mensajes y endpoints          |
| `frontend/app/admin/edit-product/[id]/page.tsx` | Callback `.then((res) => ...)` | El callback solo delega mapeo y seteo de imagenes               | `mapProductToFormData`, helpers `getLoaded*` para campos derivados                                                                                                  | Carga de producto, campos comunes, specs por categoria, imagenes existentes y defaults |
| `frontend/app/admin/layout.tsx`                 | `AdminLayout`                  | Se movio la logica de sesion a un hook local                    | `isPublicAdminPath`, `useAdminSessionGuard`                                                                                                                         | Guard admin, rutas publicas, logout, redireccion y render de `children`                |
| `frontend/app/builder/page.tsx`                 | `getCompatibilityErrors`       | Se separaron reglas de compatibilidad por responsabilidad       | `validateCpuMotherboardCompatibility`, `validateCoolerCompatibility`, `validateCoolerCaseCompatibility`, `validateStorageCompatibility`, `validatePsuCompatibility` | Mensajes, orden de errores, reglas UX y validacion backend existente                   |

## Validacion

- `npm run build`
- `npm run lint`

## Riesgos pendientes

- `npm run lint` finaliza sin errores, pero mantiene warnings existentes y algunos warnings de tipado amplio en pantallas admin/builder. No se corrigieron en esta pasada para evitar un refactor de tipos masivo.
- Recomendado validar manualmente banners, carga de producto editable, navegacion admin y compatibilidad del builder antes de despliegue.
