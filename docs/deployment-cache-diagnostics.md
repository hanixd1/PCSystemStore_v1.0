# Diagnóstico de dominios, despliegue y caché

Última auditoría pública: **2026-07-30 (America/Lima)**.

Este runbook cubre el incidente en el que algunos clientes todavía reciben el
catálogo WordPress anterior. El canonical elegido por el proyecto es:

```text
https://www.pcsystemstore.com
```

## Resumen ejecutivo

El problema no es solamente caché del navegador:

- `http://www.pcsystemstore.com.pe` todavía sirve el WordPress anterior con
  estado `200`, PHP 7.4, enlaces de WooCommerce bajo `/producto/`, cookies y
  `wp-json`.
- `http://pcsystemstore.com.pe` redirige hacia ese sitio antiguo usando HTTP.
- Las dos variantes HTTPS de `.com.pe` sí redirigen a
  `https://www.pcsystemstore.com`.
- Por tanto, un cliente que entra por HTTP, un enlace antiguo, un QR, un
  bookmark o un navegador sin HSTS puede recibir productos antiguos reales. No
  es una copia imaginaria ni únicamente un caché local.
- `.com.pe` usa nameservers de Cloudflare (`harmony`/`elmo`). Mientras esa
  delegación siga vigente, GoDaddy no es el DNS autoritativo y configurar solo
  su forwarding no corrige el tráfico.
- El dominio `.com` actual termina en Vercel. El apex HTTPS redirige a `www`
  con `307` temporal; debe convertirse en un redirect permanente `308` (o
  `301`) para dejar una sola URL estable.
- En Vercel se observó un único proyecto, `pc-system-store-frontend`, con los
  dominios `.com` apex y `www`; `.com.pe` no está asociado. La última
  producción observada estaba `READY` en el commit `b438dad`.
- En los últimos siete días se observó un grupo `fetch failed`, con tres
  ocurrencias `ETIMEDOUT` hacia el backend Railway (`69.46.46.22`) en `/`,
  `/tienda` y `/_not-found`. No se encontró evidencia de que la aplicación
  actual use un catálogo viejo como fallback.

La prioridad P0 es retirar el WordPress de la ruta pública HTTP de `.com.pe`
mediante una regla de redirect en la **zona Cloudflare de `.com.pe`**. Purgar
caché sin corregir ese routing no resuelve el incidente.

## Evidencia pública observada

### Ocho variantes de dominio

La tabla describe el estado observado el 2026-07-30. Conviene volver a guardar
la salida completa de `curl` después de cada cambio.

| URL | Resultado observado | Evaluación |
| --- | --- | --- |
| `https://www.pcsystemstore.com` | `200`, frontend nuevo servido por Vercel | Correcto |
| `https://pcsystemstore.com` | `307` hacia `https://www.pcsystemstore.com` | Llega al canonical, pero el redirect es temporal |
| `http://www.pcsystemstore.com` | `308` hacia `https://www.pcsystemstore.com/` | Correcto |
| `http://pcsystemstore.com` | `308` hacia `https://pcsystemstore.com/`, luego `307` a `www` | Llega al canonical con dos saltos y uno temporal |
| `https://www.pcsystemstore.com.pe` | `301` hacia `https://www.pcsystemstore.com` | Correcto |
| `https://pcsystemstore.com.pe` | `301` hacia `https://www.pcsystemstore.com` | Correcto |
| `http://www.pcsystemstore.com.pe` | `200`, WordPress/PHP 7.4 anterior | **Incidente crítico** |
| `http://pcsystemstore.com.pe` | `301` hacia el `www` antiguo por HTTP | **Incidente crítico** |

Comandos para registrar el primer salto, sin seguir redirects:

```bash
curl -sS -I --max-time 15 https://www.pcsystemstore.com
curl -sS -I --max-time 15 https://pcsystemstore.com
curl -sS -I --max-time 15 http://www.pcsystemstore.com
curl -sS -I --max-time 15 http://pcsystemstore.com
curl -sS -I --max-time 15 https://www.pcsystemstore.com.pe
curl -sS -I --max-time 15 https://pcsystemstore.com.pe
curl -sS -I --max-time 15 http://www.pcsystemstore.com.pe
curl -sS -I --max-time 15 http://pcsystemstore.com.pe
```

Comandos para mostrar toda la cadena:

```bash
curl -sS -I -L --max-redirs 10 --max-time 30 https://pcsystemstore.com
curl -sS -I -L --max-redirs 10 --max-time 30 http://pcsystemstore.com
curl -sS -I -L --max-redirs 10 --max-time 30 https://pcsystemstore.com.pe
curl -sS -I -L --max-redirs 10 --max-time 30 http://pcsystemstore.com.pe
```

Resultado final esperado para las ocho variantes:

- `https://www.pcsystemstore.com` responde `200`.
- Todas las demás responden en su primer salto con `301` o `308` hacia el host
  canonical HTTPS, conservando la ruta y el query string cuando sea válido.
- Ninguna variante `.com.pe` responde `200`, PHP, WordPress o WooCommerce.
- No hay loops ni más de un redirect evitable.

### Prueba reproducible del sitio y API antiguos

Estas URLs HTTP respondían desde el WordPress anterior:

```bash
curl -sS -I --max-time 15 http://www.pcsystemstore.com.pe/
curl -sS -I --max-time 15 http://www.pcsystemstore.com.pe/wp-json/
curl -sS -I --max-time 15 http://pcsystemstore.com.pe/wp-json/
curl -sS -I --max-time 15 \
  http://www.pcsystemstore.com.pe/producto/core-i3-12100f-3-3-4-30-ghz-18mb-lga1700/
```

La última URL respondía `200` y podía emitir `Set-Cookie`. La home antigua
contenía decenas de enlaces `/producto/...`. Sus equivalentes HTTPS sí
redirigían al dominio nuevo.

Después de la corrección, las cuatro pruebas deben responder `301` en el primer
salto y nunca `200`. Para comprobar que no queda una firma del stack anterior:

```bash
curl -sS --max-time 20 http://www.pcsystemstore.com.pe/ \
  | rg -io 'wp-content|wp-json|woocommerce|/producto/' \
  | sort -u
curl -sS --max-time 20 http://www.pcsystemstore.com.pe/wp-json/ \
  | rg -io 'wordpress|namespaces|routes'
```

Resultado esperado: la primera respuesta es un redirect sin body de WordPress
y no aparecen esas firmas.

### DNS observado

Comandos:

```bash
dig +short NS pcsystemstore.com
dig +short A pcsystemstore.com
dig +short AAAA pcsystemstore.com
dig +short CNAME www.pcsystemstore.com

dig +short NS pcsystemstore.com.pe
dig +short A pcsystemstore.com.pe
dig +short AAAA pcsystemstore.com.pe
dig +short CNAME www.pcsystemstore.com.pe
```

Evidencia observada:

- `pcsystemstore.com` delega en los nameservers Cloudflare `gigi` y `tadeo`.
- El apex `.com` resolvía a `216.198.79.65` y `64.29.17.65`.
- `www.pcsystemstore.com` tenía un CNAME de Vercel.
- Las respuestas HTTP del sitio actual mostraban Vercel y no encabezados
  `cf-*`; esto indica que, aunque Cloudflare aloja la zona DNS, los registros
  públicos actuales parecen estar en modo DNS-only. Debe confirmarse en el
  panel.
- `pcsystemstore.com.pe` delega en los nameservers Cloudflare `harmony` y
  `elmo`.

Conclusión operativa: GoDaddy puede seguir siendo el registrador de `.com.pe`,
pero **no controla sus respuestas DNS** mientras los NS autoritativos sean los
de Cloudflare.

## Corrección P0: `.com.pe` redirect-only en Cloudflare

Aplicar en la zona **`pcsystemstore.com.pe`**, no solamente en
`pcsystemstore.com`.

La configuración recomendada sigue el patrón oficial de Cloudflare para un
[dominio dedicado a redirects](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/):

1. Guardar evidencia de la configuración actual y tomar un backup del
   WordPress antes de retirar su origen.
2. En DNS, reemplazar los registros de `@` y `www` que alcanzan al hosting
   anterior por registros proxied que apunten a la IP reservada `192.0.2.1`.
3. Eliminar registros A, AAAA o CNAME conflictivos que aún apunten al origen
   anterior.
4. Crear una **Single Redirect** que cubra ambos hosts y ambos protocolos.

Expresión:

```text
(http.host in {"pcsystemstore.com.pe" "www.pcsystemstore.com.pe"})
```

Target dinámico:

```text
concat("https://www.pcsystemstore.com", http.request.uri.path)
```

Opciones:

```text
Status code: 301
Preserve query string: enabled
```

La regla debe estar por encima de cualquier regla incompatible. No se debe usar
masking ni mantener un segundo frontend en `.com.pe`.

Validación inmediata:

```bash
curl -sS -I --max-time 15 http://pcsystemstore.com.pe/
curl -sS -I --max-time 15 http://www.pcsystemstore.com.pe/
curl -sS -I --max-time 15 https://pcsystemstore.com.pe/
curl -sS -I --max-time 15 https://www.pcsystemstore.com.pe/
curl -sS -I --max-time 15 http://www.pcsystemstore.com.pe/wp-json/
curl -sS -I --max-time 15 \
  'http://www.pcsystemstore.com.pe/producto/core-i3-12100f-3-3-4-30-ghz-18mb-lga1700/?source=incident'
```

Todos deben emitir `301` hacia el host canonical. El último debe conservar
`?source=incident`.

Después de validar desde al menos dos redes y con DNS público:

- Purgar el caché de la zona `.com.pe`.
- Retirar del acceso público el origen WordPress anterior.
- Mantener un backup fuera de línea durante el periodo de rollback acordado.
- No borrar el origen antes de confirmar que no contiene información que deba
  migrarse o conservarse legalmente.

## Política de caché esperada

La aplicación actual usa una política deliberadamente corta:

- Detalle de producto y fetches ejecutados por el navegador: `no-store`.
- Listados SSR, relacionados y banners: `revalidate: 15`.
- Branding: `revalidate: 30`.
- HTML crítico: `Cache-Control: no-store`.

Los intervalos de 15/30 segundos son caché corta controlada para no agotar el
throttle compartido de Railway. No deben ampliarse a horas o días para precio,
stock, oferta, disponibilidad, publicación o despublicación.

Rutas que no deben recibir `Cache Everything` ni una TTL larga en Cloudflare:

```text
/categoria/*
/product/*
/producto/*
/tienda*
/ofertas*
/builder*
/checkout*
/mi-cuenta*
/admin*
/api/*
```

También deben excluirse de caché las respuestas del backend Railway, stock,
precios, productos, banners y branding. Cloudflare no debe cachear respuestas
con `Set-Cookie`.

Comandos de control:

```bash
curl -sS -I --max-time 15 https://www.pcsystemstore.com/
curl -sS -I --max-time 15 https://www.pcsystemstore.com/tienda
curl -sS -I --max-time 15 \
  https://www.pcsystemstore.com/categoria/componentes
curl -sS -I --max-time 15 \
  https://www.pcsystemstore.com/product/REEMPLAZAR_ID
curl -sS -I --max-time 15 https://www.pcsystemstore.com/ofertas
```

Revisar:

```text
status
location
cache-control
age
cf-cache-status
cf-ray
x-vercel-cache
x-vercel-id
server
set-cookie
vary
etag
```

Resultados aceptables:

- HTML dinámico: `no-store, no-cache, must-revalidate, proxy-revalidate`, sin
  `Age` creciente.
- Si una respuesta deliberadamente usa caché corta:
  `max-age=0, s-maxage<=30` y `stale-while-revalidate` corto.
- Nunca una TTL de horas/días para HTML, catálogo, precio o stock.
- `cf-cache-status: HIT` en un asset versionado de `/_next/static/` es normal.
- `cf-cache-status: HIT` en catálogo/API/HTML dinámico es un fallo.
- `x-vercel-cache` puede aparecer en HTML generado por Vercel; debe interpretarse
  junto con `Cache-Control` y no justificar contenido viejo.

Ejecutar una misma consulta tres veces, incluyendo un cache buster:

```bash
curl -sS -I https://www.pcsystemstore.com/tienda
curl -sS -I https://www.pcsystemstore.com/tienda
curl -sS -I \
  "https://www.pcsystemstore.com/tienda?cache-audit=$(date +%s)"
```

`Age` no debe crecer en HTML `no-store`. El cache buster es una herramienta de
diagnóstico; no reemplaza una política correcta.

## Validación del backend Railway actual

Backend esperado:

```text
https://pcsystemstorebackend-production.up.railway.app
```

Pruebas:

```bash
curl -sS -I --max-time 15 \
  https://pcsystemstorebackend-production.up.railway.app/health
curl -sS -D - -o /dev/null --max-time 20 \
  'https://pcsystemstorebackend-production.up.railway.app/products?page=1&limit=2'
curl -sS -D - -o /dev/null --max-time 20 \
  https://pcsystemstorebackend-production.up.railway.app/public/banners
curl -sS -D - -o /dev/null --max-time 20 \
  https://pcsystemstorebackend-production.up.railway.app/version
```

Si `/version` todavía no está implementado, `404` es esperable; no debe
confundirse con indisponibilidad del servicio.

Comprobar CORS sin exponer credenciales:

```bash
curl -sS -I --max-time 15 \
  -H 'Origin: https://www.pcsystemstore.com' \
  https://pcsystemstorebackend-production.up.railway.app/products
curl -sS -I --max-time 15 \
  -H 'Origin: https://pcsystemstore.com.pe' \
  https://pcsystemstorebackend-production.up.railway.app/products
```

Esperado:

- El origen canonical recibe
  `Access-Control-Allow-Origin: https://www.pcsystemstore.com`.
- `.com.pe` no necesita CORS si solo redirige y no ejecuta frontend.
- No hay wildcard `*` con credenciales en producción.
- Productos públicos vienen de la base Neon actual y excluyen inactivos,
  soft-deleted, ocultos y datos de prueba.
- Fallos de Railway no activan mocks ni fallback hardcodeado en el frontend.

Por el `ETIMEDOUT` observado, correlacionar en Railway y Vercel el timestamp,
request path y deployment. Revisar saturación, límites de conexiones Neon,
memory/CPU, cold starts, timeouts de red y reinicios. Una respuesta lenta o
fallida debe producir un estado de error controlado, nunca catálogo antiguo.

## Cómo detectar HTML, JSON o assets viejos

### HTML y canonical

```bash
curl -sS --max-time 20 https://www.pcsystemstore.com/ \
  | rg -io '<link[^>]+canonical[^>]*>'
curl -sS --max-time 20 https://www.pcsystemstore.com/ \
  | rg -io 'pcsystemstore\.com\.pe|wp-content|wp-json|woocommerce|/producto/'
```

Esperado:

- Canonical bajo `https://www.pcsystemstore.com`.
- Ninguna referencia de runtime a `.com.pe`, WordPress o WooCommerce.
- Una mención histórica en documentación o texto legal no equivale a una URL
  operativa; revisar el contexto antes de eliminarla.

### Robots y sitemap

```bash
curl -sS --max-time 20 https://www.pcsystemstore.com/robots.txt
curl -sS --max-time 20 https://www.pcsystemstore.com/sitemap.xml \
  | rg -o 'https?://[^<]+' \
  | sort -u
```

En la auditoría viva ambos usaban exclusivamente
`https://www.pcsystemstore.com`. Debe seguir siendo así.

### Build y assets de Next.js

```bash
curl -sS --max-time 20 https://www.pcsystemstore.com/ \
  | rg -o '/_next/static/[^" ?]+' \
  | sort -u
curl -sS -I --max-time 20 \
  https://www.pcsystemstore.com/_next/static/REEMPLAZAR_ASSET
```

Los assets bajo `/_next/static/` llevan hash de contenido y pueden cachearse por
mucho tiempo. No se debe reutilizar una URL sin hash para contenido mutable.
Comparar el hash del asset con el deployment Vercel activo, no solo su fecha.

Para guardar una huella reproducible:

```bash
curl -sS --max-time 20 https://www.pcsystemstore.com/ | shasum -a 256
curl -sS --max-time 20 \
  'https://pcsystemstorebackend-production.up.railway.app/products?page=1&limit=2' \
  | shasum -a 256
```

La huella de JSON puede cambiar legítimamente; guardar también timestamp,
deployment y conteo de productos.

### Service worker y almacenamiento local

```bash
curl -sS -I --max-time 15 https://www.pcsystemstore.com/sw.js
curl -sS -I --max-time 15 \
  https://www.pcsystemstore.com/service-worker.js
curl -sS -I --max-time 15 \
  https://www.pcsystemstore.com/manifest.json
```

Si existe un service worker, comprobar en DevTools:

1. Application > Service Workers: script URL, estado y versión.
2. Cache Storage: no debe contener HTML, `/api`, catálogo ni respuestas
   Railway.
3. Application > Clear storage: ejecutar una prueba limpia.
4. Network > Disable cache: comparar con una sesión normal.
5. Probar en un perfil de navegador que haya visitado la web antigua.

No pedir a todos los clientes que limpien caché como solución primaria. Primero
se debe impedir que cualquier origen entregue contenido viejo.

## Checklist manual de Cloudflare

Realizar la revisión en **ambas zonas** y guardar capturas/export de reglas.

### Zona `pcsystemstore.com.pe`

- [ ] Confirmar NS autoritativos `harmony`/`elmo`.
- [ ] Confirmar que GoDaddy actúa solo como registrador mientras esos NS sigan
      delegados.
- [ ] Sustituir A/CNAME/AAAA del hosting WordPress anterior.
- [ ] Configurar `@` y `www` proxied hacia `192.0.2.1`.
- [ ] Confirmar Universal SSL activo y SSL/TLS en Full (Strict) para cualquier
      origen que aún permanezca durante la transición.
- [ ] Activar Always Use HTTPS; la Single Redirect debe seguir enviando HTTP
      directamente al canonical sin loops.
- [ ] Crear la Single Redirect exacta para apex + `www`, HTTP + HTTPS.
- [ ] Usar `301`, conservar path y query string.
- [ ] Eliminar Page Rules/Redirect Rules que manden apex al `www` antiguo.
- [ ] Revisar Workers, Routes, Snippets, Bulk Redirects y Transform Rules.
- [ ] Confirmar que ningún Worker devuelve HTML, JSON o assets antiguos.
- [ ] Ejecutar Purge Everything una vez después de corregir las reglas.
- [ ] Validar `/`, `/wp-json/` y el slug de producto antiguo por HTTP y HTTPS.
- [ ] Retirar el origen WordPress público tras validar el redirect.

### Zona `pcsystemstore.com`

- [ ] Confirmar `www` CNAME al proyecto Vercel actual.
- [ ] Confirmar apex con los registros recomendados actualmente por Vercel.
- [ ] Eliminar A, AAAA o CNAME antiguos/conflictivos.
- [ ] Confirmar si los registros están DNS-only; la ausencia de `cf-*` pública
      sugiere que sí.
- [ ] Si se usa proxy naranja, configurar SSL/TLS Full (Strict), Always Use
      HTTPS y certificado de origen válido.
- [ ] No aplicar `Cache Everything` global.
- [ ] Bypass de HTML y rutas dinámicas listadas en este documento.
- [ ] No cachear API ni respuestas con `Set-Cookie`.
- [ ] Revisar Page Rules, Cache Rules, Redirect Rules, Workers y Transform
      Rules heredadas.
- [ ] No redirigir nunca hacia `.com.pe`.
- [ ] Purge Everything una vez tras la corrección.
- [ ] Confirmar que apex redirige permanentemente a `www`.

Nota: si `.com` permanece DNS-only, las Cache Rules y el purge de Cloudflare no
afectan el tráfico del sitio; la caché efectiva se gestiona en Vercel/Next.js y
en el navegador.

## Checklist manual de GoDaddy

- [ ] Confirmar que GoDaddy es el registrador de `.com.pe`.
- [ ] Confirmar los nameservers publicados.
- [ ] Si son `harmony`/`elmo`, hacer todos los cambios DNS/redirect en
      Cloudflare, no en el editor DNS de GoDaddy.
- [ ] No habilitar masking.
- [ ] No dejar forwarding `302`.
- [ ] No dejar el hosting WordPress asociado a `@` o `www`.
- [ ] Si se decide volver a nameservers GoDaddy, planificar la migración de zona
      completa y usar forwarding `301`, Forward only, destino
      `https://www.pcsystemstore.com`; no cambiar NS durante el incidente sin
      comparar todos los registros.
- [ ] Renovación automática y datos del registrante activos para evitar que el
      dominio vuelva a parking.
- [ ] Confirmar si `admin@pcsystemstore.com.pe` y
      `ventas@pcsystemstore.com.pe` siguen siendo buzones comerciales activos.
      El redirect web no requiere retirar sus registros MX.
- [ ] Si el correo también migrará a `.com`, crear y probar primero los nuevos
      buzones; después actualizar las páginas de contacto y legales. No
      sustituir esas direcciones solo por cambiar el canonical web.

## Checklist manual de Vercel

Estado observado:

```text
Project: pc-system-store-frontend
Production domains: pcsystemstore.com, www.pcsystemstore.com
.com.pe attached: no
Latest observed production: READY
Commit: b438dad
```

- [ ] Mantener `www.pcsystemstore.com` como Production Domain principal.
- [ ] Cambiar el redirect temporal `307` del apex a permanente `308` o `301`.
- [ ] Verificar los cuatro primeros saltos `.com` con `curl`; evitar una cadena
      HTTP -> HTTPS apex -> HTTPS www cuando puede resolverse en un salto.
- [ ] Confirmar que ningún proyecto Vercel antiguo conserva `.com.pe` o un
      subdominio que se distribuya a clientes.
- [ ] Confirmar `NEXT_PUBLIC_SITE_URL=https://www.pcsystemstore.com`.
- [ ] Confirmar que `NEXT_PUBLIC_API_URL` es exactamente el backend Railway
      actual, sin `/api` duplicado y sin URL de preview.
- [ ] Confirmar `NEXT_PUBLIC_APP_VERSION`/`NEXT_PUBLIC_COMMIT_SHA` si se
      implementan; no incluir secretos.
- [ ] Revisar variables por target Production/Preview/Development.
- [ ] Promover únicamente un deployment asociado al commit aprobado.
- [ ] Revisar logs del grupo `fetch failed` y las tres ocurrencias
      `ETIMEDOUT`.
- [ ] Ejecutar redeploy sin build cache solo si existe evidencia de artefacto
      obsoleto; no usarlo como sustituto de corregir redirects/caché.
- [ ] Validar canonical, sitemap, robots y `_next/static` después de promover.

No adjuntar `.com.pe` como un segundo dominio productivo. Si se incorporara a
Vercel, debe configurarse únicamente como redirect hacia `www`; la opción
Cloudflare redirect-only es más simple con la delegación actual.

## Checklist manual de Railway

- [ ] Confirmar que el servicio activo corresponde a
      `pcsystemstorebackend-production.up.railway.app`.
- [ ] Confirmar que no hay backend antiguo activo recibiendo tráfico.
- [ ] Confirmar que Production usa la base Neon actual y no una base de seed,
      QA o preview.
- [ ] Configurar `FRONTEND_URL=https://www.pcsystemstore.com`.
- [ ] Permitir en CORS `https://www.pcsystemstore.com` y, durante la transición,
      `https://pcsystemstore.com`; no se necesita `.com.pe` si solo redirige.
- [ ] Mantener `CSRF_ALLOWED_ORIGINS` coherente con CORS.
- [ ] No usar wildcard CORS en producción.
- [ ] Correlacionar los tres `ETIMEDOUT` observados con CPU, memory, restarts,
      request duration y conexiones Neon.
- [ ] Confirmar que `/health` no ejecuta una consulta costosa a la DB.
- [ ] Confirmar que `/version`, si existe, no expone secretos.
- [ ] Verificar endpoints de productos, banners, stock y ofertas directamente.
- [ ] Revisar crons, seeds y jobs; ninguno debe reactivar productos antiguos.
- [ ] Revisar logs después de cada deployment y mantener disponible el último
      deployment sano para rollback.

## Checklist manual de Neon

- [ ] Confirmar project, branch y database usados por Railway Production.
- [ ] Comparar el host de `DATABASE_URL` con el proyecto Neon esperado sin
      copiar credenciales a tickets o capturas.
- [ ] Crear restore point/branch de backup antes de actualizar datos o schema.
- [ ] Contar productos totales, activos, inactivos y soft-deleted.
- [ ] Buscar productos legacy por nombres/SKU conocidos.
- [ ] Confirmar que queries públicas filtran `active = true`.
- [ ] Confirmar `deletedAt IS NULL` si existe soft delete.
- [ ] Confirmar flags de oculto, test/admin-only y reglas de stock.
- [ ] No borrar productos masivamente; desactivar por una lista revisada y
      guardar IDs/resultados.
- [ ] Revisar pool/connections por los timeouts Railway observados.
- [ ] No ejecutar un seed de desarrollo o QA en Production.

Consultas SQL orientativas; adaptar nombres reales del schema antes de
ejecutarlas:

```sql
SELECT COUNT(*) AS total FROM "Product";

SELECT
  "isActive",
  COUNT(*) AS total
FROM "Product"
GROUP BY "isActive";

SELECT COUNT(*) AS soft_deleted
FROM "Product"
WHERE "deletedAt" IS NOT NULL;

SELECT "id", "name", "sku", "isActive", "deletedAt"
FROM "Product"
WHERE "name" ILIKE '%NOMBRE_LEGACY%'
   OR "sku" IN ('SKU_LEGACY')
ORDER BY "updatedAt" DESC;
```

Estas consultas son plantillas, no autorización para mutar datos.

En la lectura viva del 2026-07-30, Neon contenía 101 productos; 100 tenían
stock positivo y uno stock cero. Sus fechas de creación/actualización eran de
2026 y el total coincidía con el endpoint Railway. No se identificó allí un
segundo catálogo histórico. Antes de esta migración, la tabla todavía no tenía
`isActive`/`deletedAt`; la migración versionada los añade dejando los registros
existentes activos por defecto. Esto refuerza que el WordPress HTTP, y no la
base Neon actual, es la fuente principal del catálogo antiguo observado.

## Orden recomendado de despliegue

1. Abrir el incidente, guardar headers/DNS actuales y hacer backup del
   WordPress y restore point/branch Neon.
2. Probar `prisma migrate deploy` en una branch Neon temporal y verificar que
   los 101 registros existentes queden activos; no ejecutar seeds.
3. Aplicar en Production la migración aditiva
   `20260730120000_add_product_publication_state` antes de arrancar el backend
   nuevo. Confirmar conteos y columnas.
4. Desplegar Railway y validar directamente health, version, productos, stock,
   banners, headers no-store, CORS y conexión a la DB Neon correcta.
5. Configurar variables Production en Vercel y desplegar frontend.
6. Validar el deployment Vercel antes de promover: catálogo, login, carrito,
   checkout, admin, canonical, sitemap y robots.
7. Promover el frontend y convertir apex `.com` a redirect permanente.
8. Aplicar la regla redirect-only de Cloudflare en `.com.pe`.
9. Ejecutar purge controlado y repetir la matriz de ocho URLs desde dos redes.
10. Observar Vercel/Railway durante al menos una ventana de tráfico real.
11. Retirar el origen WordPress público cuando todas las pruebas sean verdes.

Esta secuencia evita que el frontend nuevo dependa de un backend/schema que aún
no está listo y elimina el sitio antiguo al final, cuando el nuevo camino ya
fue comprobado.

## Rollback seguro

Un rollback no debe volver a publicar WordPress ni productos antiguos.

- **Vercel:** promover el último deployment Production conocido como sano.
  Mantener el canonical y los redirects al host nuevo.
- **Railway:** hacer rollback al último deployment compatible con el schema
  Neon actual. Validar `/health` y productos antes de reabrir tráfico.
- **Neon:** restaurar desde branch/restore point solo tras evaluar pérdida de
  escrituras recientes. Preferir corrección forward si hubo pedidos o cambios
  de stock desde el backup.
- **Cloudflare `.com`:** desactivar temporalmente una Cache Rule defectuosa y
  purgar; no redirigir a `.com.pe`.
- **Cloudflare `.com.pe`:** mantener el redirect al sitio nuevo aun durante el
  rollback de Vercel/Railway. Si la regla misma está mal, corregir target/path;
  no reactivar el origen viejo.
- **301:** los navegadores pueden memorizarlo. Probar primero la regla en una
  ventana corta con un host de staging o un `302`, y cambiar a `301` únicamente
  después de validar el target final. El estado definitivo debe ser `301`.
- Documentar quién ejecutó el rollback, timestamps, deployment IDs, commit,
  branch Neon y resultados de la matriz de URLs.

## Matriz final de aceptación

```bash
for url in \
  https://www.pcsystemstore.com \
  https://pcsystemstore.com \
  http://www.pcsystemstore.com \
  http://pcsystemstore.com \
  https://www.pcsystemstore.com.pe \
  https://pcsystemstore.com.pe \
  http://www.pcsystemstore.com.pe \
  http://pcsystemstore.com.pe
do
  curl -sS -I --max-time 15 "$url"
done
```

- [ ] Solo `https://www.pcsystemstore.com` devuelve `200`.
- [ ] Las otras siete variantes hacen `301`/`308` al canonical.
- [ ] `.com.pe/wp-json/` por HTTP y HTTPS nunca devuelve `200`.
- [ ] El slug de producto WordPress por HTTP y HTTPS nunca devuelve `200`.
- [ ] Ninguna respuesta pública contiene WordPress/WooCommerce/PHP anterior.
- [ ] `/tienda`, categoría, producto y ofertas no tienen caché agresivo.
- [ ] Precio, stock, oferta y publicación vienen del backend Railway actual.
- [ ] No hay `Age` creciente ni `CF-Cache-Status: HIT` en HTML/API dinámica.
- [ ] Assets Next versionados pueden cachearse y corresponden al deployment
      activo.
- [ ] Robots, sitemap, canonical y OpenGraph usan el host canonical.
- [ ] No existe service worker sirviendo HTML/API anterior.
- [ ] Vercel y Railway no registran timeouts sostenidos.
- [ ] Login, carrito, checkout, admin, catálogo, builder y chatbot pasan smoke
      tests.
- [ ] Se guardaron salidas de DNS/HTTP, deployment IDs, commit y timestamp como
      evidencia de cierre.

## Evidencia que debe adjuntarse al cierre

- Salida completa de la matriz de ocho URLs, primer salto y cadena.
- Salida de los cuatro `dig` por zona.
- Captura/export de DNS y Single Redirect de `.com.pe`.
- Captura de dominios y deployment Production en Vercel.
- Variables verificadas por nombre y entorno, con valores sensibles ocultos.
- Logs correlacionados de Vercel/Railway para los timeouts.
- Conteos Neon antes/después, sin datos personales ni credenciales.
- Hash de HTML/JSON, commit y deployment IDs.
- Resultado de smoke tests en un perfil limpio y en un navegador que visitó el
  sitio antiguo.
