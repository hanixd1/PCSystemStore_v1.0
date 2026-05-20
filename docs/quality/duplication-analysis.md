# Analisis de duplicidad

Fecha: 2026-05-20

Objetivo: reducir duplicidad de forma prudente sin cambiar comportamiento funcional ni mover reglas
criticas de negocio. La duplicidad global reportada era aproximadamente 2.4%, por debajo de un nivel
critico; por eso se priorizaron refactors evidentes y de bajo riesgo.

| Archivo | Duplicidad detectada | Clasificacion | Accion tomada | Justificacion | Riesgo | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `frontend/app/admin/reset-password/page.tsx` | Formulario y flujo casi identico al reset de cliente | Refactor recomendable | Reemplazado por `ResetPasswordForm` compartido con props admin | Mismo endpoint y validaciones; se mantienen rutas y textos admin por props | Bajo | Corregido |
| `frontend/app/auth/reset-password/page.tsx` | Formulario y flujo casi identico al reset admin | Refactor recomendable | Reemplazado por `ResetPasswordForm` compartido con props cliente | Reduce duplicidad sin mezclar seguridad; la pagina conserva `loginPath=/auth/login` | Bajo | Corregido |
| `frontend/app/admin/forgot-password/page.tsx` | Formulario y submit casi identicos al forgot cliente | Refactor recomendable | Reemplazado por `ForgotPasswordForm` compartido con `flow=admin` | Mantiene flow admin explicito y mensaje generico del backend | Bajo | Corregido |
| `frontend/app/auth/forgot-password/page.tsx` | Formulario y submit casi identicos al forgot admin | Refactor recomendable | Reemplazado por `ForgotPasswordForm` compartido con `flow=client` | Mantiene ruta cliente y estilos propios via props | Bajo | Corregido |
| `frontend/lib/productPayload.ts` | Bloques repetidos de `Object.assign(payload, pick(...))` por categoria | Duplicidad aceptable | Sin cambios funcionales | El archivo ya usa `pick`; extraer mas podria ocultar el contrato de payload por categoria y afectar create/edit | Medio | Pendiente |
| `frontend/components/MegaMenu.tsx` | Estructuras repetidas de links, categorias y subitems | Duplicidad aceptable | Sin refactor adicional en esta tarea | Ya se corrigio accesibilidad previamente; extraer componentes internos es posible, pero no aporta suficiente reduccion frente al riesgo de romper navegacion | Bajo/medio | Aceptado |
| `frontend/lib/products/productFiltersConfig.ts` | Filtros repetidos de marca, opciones booleanas y rangos | Duplicidad aceptable | Sin cambios funcionales | La configuracion explicita preserva orden visual y legibilidad; conviene refactor gradual por familias de filtros | Bajo | Pendiente |
| `frontend/app/admin/add-product/page.tsx` | Formulario grande con patrones repetidos por categoria | No tocar | Sin cambios | Formulario sensible y recientemente corregido por accesibilidad/validacion; refactor comun con edit-product seria amplio | Alto | Aceptado |
| `frontend/app/admin/edit-product/[id]/page.tsx` | Patrones repetidos con add-product y helpers internos | No tocar | Sin cambios en esta tarea | Ya contiene helpers locales de campos; mover a componente comun podria cambiar payload/estado | Alto | Aceptado |
| `backend/src/products/products-filter.service.spec.ts` | Fixtures y expectativas similares entre tests | Duplicidad aceptable | Sin cambios | En tests, repeticion explicita mejora lectura de casos y evita fixtures opacos | Bajo | Aceptado |
| `backend/src/users/users.service.ts` | Duplicidad baja en normalizacion email/reset | Duplicidad aceptable | Sin cambios | Ya existen helpers de token/rutas; tocar reset password backend tiene riesgo de seguridad | Medio | Aceptado |
| `backend/src/ai/ai.service.ts` | Duplicidad baja en scoring/normalizacion | No tocar | Sin cambios | Flujo conversacional y recomendaciones son sensibles; la duplicidad es baja | Medio | Aceptado |

## Componentes creados

- `frontend/components/auth/ForgotPasswordForm.tsx`
- `frontend/components/auth/ResetPasswordForm.tsx`

## Criterio aplicado

- Se refactorizo solo duplicidad de UI y submit claramente equivalente.
- Se conservaron rutas y flujos admin/cliente como props explicitas.
- No se tocaron pagos, stock, checkout, JWT, roles, Prisma ni IA.
- No se busco llegar a 0% de duplicidad porque aumentaria complejidad y riesgo.

## Pendientes recomendados

- Revisar `frontend/lib/productPayload.ts` en una tarea separada con pruebas de snapshot de payload por categoria.
- Revisar `productFiltersConfig.ts` si se agregan nuevas categorias; extraer filtros comunes solo si no reduce legibilidad.
- No refactorizar formularios admin grandes hasta tener tests de submit/payload y pruebas visuales basicas.
