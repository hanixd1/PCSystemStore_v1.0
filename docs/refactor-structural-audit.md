# Auditoria para el refactor estructural

Esta es una fase de caracterizacion. No cambia rutas HTTP, el esquema Prisma ni
el comportamiento visible. La extraccion debe conservar a `ProductsService` y
`UsersService` como fachadas hasta que sus contratos actuales esten cubiertos
por pruebas.

## Inventario y responsabilidades

| Archivo | Lineas | Responsabilidades observadas | Riesgo |
| --- | ---: | --- | --- |
| `backend/src/products/products.service.ts` | 5,187 | Validacion y normalizacion, SKU/slug, create/update/delete, payloads de specs para 25 categorias, filtros/busqueda, inventario admin, filtros dinamicos, relacionados tecnicos y auditoria. | Muy alto: concentra persistencia Prisma, reglas de negocio y el contrato de todos los endpoints de productos. |
| `backend/src/products/import/product-import.service.ts` | 1,802 | Lectura XLSX/ZIP, validacion de archivos/columnas, normalizacion de filas, mapeo de specs por categoria, preview, create/update masivo, subida Cloudinary y reporte/auditoria. | Alto: mezcla IO, parsing y escrituras con efectos externos. |
| `backend/src/users/users.service.ts` | 1,467 | Login cliente/admin, bloqueo de intentos, JWT, Google OAuth/OAuth PKCE, tokens de cuenta, registro, reset/verificacion, perfiles, direcciones, usuarios internos, roles y auditoria. | Muy alto: seguridad, cuentas y flujos publicos en el mismo servicio. |
| `frontend/app/admin/add-product/page.tsx` | 4,007 | Estado inicial, departamentos/opciones, validacion, campos base, 25 secciones de specs, imagenes y envio multipart. | Alto: el formulario de alta es el origen de muchas reglas de interfaz. |
| `frontend/app/admin/edit-product/[id]/page.tsx` | 2,710 | Carga y normalizacion de producto existente, estado, imagenes existentes/nuevas, validacion, 24 secciones de specs y PATCH. | Alto: puede perder datos si el mapeo de API a formulario cambia. |
| `frontend/components/Chatbot.tsx` | 1,497 | UI, estado conversacional, busqueda guiada, deteccion local de categorias/filtros, llamadas a catalogo/IA y render de mensajes/tarjetas. | Medio-alto: estado asincrono y reglas de consulta estan acoplados al JSX. |

## Dependencias y contratos que deben conservarse

### Productos

`ProductsService` inyecta `PrismaService`, `AuditService` y
`ProductPricingService`; usa `CreateProductDto`, `UpdateProductDto`,
`ProductQuery` local y los helpers de `product-search.ts`. Los controllers y el
importador dependen de estos metodos publicos: `create`, `findAll`,
`findAdminInventory`, `getFilterOptions`, `chatSearch`, `findRelated`,
`findBySlug`, `findByIdOrSlug`, `findOne`, `update` y `remove`.

La primera extraccion segura es codigo sin IO: normalizacion/validacion,
construccion de slug y mapeo de specs. La segunda es query/filtros/relacionados.
La escritura Prisma y auditoria deben mantenerse detras de la fachada actual
hasta contar con pruebas de caracterizacion de create/update/delete.

### Importacion masiva

`ProductImportService` inyecta `PrismaService`, `ProductsService`,
`CloudinaryService` y `AuditService`; su contrato publico se limita a
`preview` y `confirm`, consumidos por `ProductImportController`. Ya existen
`product-import-normalizers.ts`, `product-import-catalog.ts` y
`product-import.types.ts`; son los limites naturales para continuar extrayendo
parser, validador y ejecutor sin cambiar el endpoint.

### Usuarios

`UsersService` inyecta `PrismaService`, `JwtService` y `EmailService`.
`UsersController` contiene las cookies de sesion y estado OAuth; el servicio no
debe asumir esa responsabilidad al refactorizar. Los contratos publicos incluyen
login cliente/admin, OAuth, reset/verificacion, perfil/direcciones y gestion de
usuarios internos. Se deben conservar los flujos y roles expuestos por
`UsersController` sin cambiar las rutas.

### Formularios y chatbot

Ambas paginas administrativas usan `buildProductPayload`,
`validateProductForm`, `ImageUploader`, `api` y `notify`. Editar anade el mapper
de respuesta API a formulario, normalizadores locales y `ProductOfferSection`.
El chatbot usa `api`, `parseBooleanLike` y `useCartStore`; consulta
`/products/chat-search` y el endpoint de IA actual. Esos contratos no deben
cambiar durante una extraccion visual.

## Duplicacion add/edit

Los formularios repiten constantes de opciones, campos base, handlers de
dependencias (CPU/socket, headset/conexion, almacenamiento/tipo), validacion,
construccion de payload, secciones de specs e `ImageUploader`. Comparten 24
categorias de especificaciones; `SOFTWARE` aparece en alta pero no en la lista
condicional de edicion, una diferencia que debe caracterizarse antes de
unificarla.

Las extracciones candidatas son:

- `productFormConfig.ts`: departamentos, opciones, valores por defecto y reglas
  de dependencia por categoria.
- `types.ts`, `productFormInitialState.ts` y `productFormMapper.ts`: tipo de
  formulario, defaults de alta y mapeo API-a-formulario de edicion.
- `useProductForm.ts`: estado, cambios de campo, multiseleccion, dependencias y
  validacion. Debe recibir adaptadores de alta/edicion para no mezclar sus
  flujos de imagenes.
- `ProductBasicFields`, `ProductOfferFields`, `ProductMediaFields` y
  `ProductSpecsFields`: composicion compartida.
- Componentes de `specs/` por familia, empezando por CPU, motherboard, RAM,
  GPU, PSU, CASE, COOLER y STORAGE. Perifericos, audio y ordenadores deben
  llegar en iteraciones posteriores.

## Estructura objetivo propuesta

```text
frontend/features/products/form/
  types.ts
  productFormConfig.ts
  productFormInitialState.ts
  productFormMapper.ts
  useProductForm.ts
  ProductForm.tsx
  ProductBasicFields.tsx
  ProductMediaFields.tsx
  ProductSpecsFields.tsx
  specs/{Cpu,Motherboard,Ram,Gpu,Psu,Case,Cooler,Storage,...}SpecsFields.tsx

frontend/features/chatbot/
  catalogFilters.ts
  guidedSearch.ts
  useChatConversation.ts
  ChatMessages.tsx
  ChatProductCard.tsx

backend/src/products/services/
  product-validation.service.ts
  product-slug.service.ts
  product-specs-payload.service.ts
  product-query.service.ts
  product-related.service.ts
  product-write.service.ts

backend/src/products/import/services/
  product-import-parser.service.ts
  product-import-validator.service.ts
  product-import-executor.service.ts

backend/src/users/services/
  user-auth.service.ts
  google-oauth.service.ts
  account-token.service.ts
  password-reset.service.ts
  user-profile.service.ts
  internal-users.service.ts
```

## Orden de extraccion recomendado

1. Ampliar caracterizacion de helpers puros y mover solo constantes/tipos
   frontend sin alterar JSX.
2. Extraer mapper/defaults/configuracion del formulario; mantener ambas paginas
   como consumidores separados.
3. Extraer los primeros componentes de specs compartidos y comparar payloads de
   create/edit por categoria.
4. Extraer normalizacion, validacion, slugs y specs payload del backend, dejando
   `ProductsService` como fachada.
5. Extraer query/relacionados y despues escritura/auditoria en cambios pequenos.
6. Separar parser/validador/ejecutor de importacion.
7. Separar auth, OAuth, tokens/reset y perfil de usuarios, preservando
   `UsersService` como adaptador temporal.
8. Extraer helpers puros y subcomponentes del chatbot; mover el hook de estado
   conversacional al final.

## Checklist de no regresion

### Frontend admin

- Crear producto simple, CPU, GPU y RAM.
- Crear producto con stock `0`.
- Editar sin perder specs ni imagenes existentes.
- Editar valores Si/No sin convertir `No` a `true`.
- Subir, mostrar y guardar imagenes.
- Activar/desactivar oferta y guardar cambios.

### Backend productos

- Listar, buscar y filtrar por categoria.
- Obtener detalle por slug/id.
- Crear, editar y eliminar producto.
- Actualizar stock y precios/ofertas.
- Importar productos y confirmar el reporte de errores.
- Mantener relacionados y compatibilidad CPU/placa/RAM/M.2 cuando aplique.

### Usuarios y chatbot

- Login admin y cliente, roles, cookies y logout.
- Reset admin y cliente, set password y verificacion de email.
- Google OAuth si esta configurado.
- Consultas chatbot: procesador AMD/Intel, RTX 4060, RAM DDR5 y contexto
  conversacional.

## Cobertura existente y huecos

Hay suites para filtros, busqueda, relacionados, ofertas y actualizacion de
productos; importacion por categoria; auth/roles de usuarios; y payload,
booleanos, normalizadores y precios del frontend. Esta fase agrega una prueba
directa de normalizadores de importacion (booleanos, headers, SKU y sockets).

Faltan caracterizaciones especificas para `buildSlug`/unicidad de slug, mapper
API-a-formulario de edicion, persistencia de imagenes, reset/OAuth y el flujo
local completo del chatbot. Deben agregarse justo antes de extraer cada bloque,
no en una unica bateria masiva.
