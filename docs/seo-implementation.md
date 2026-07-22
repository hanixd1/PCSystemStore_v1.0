# Implementación SEO técnica

## 1. Diagnóstico inicial

La portada era un Client Component completo. Obtenía `/products` con Axios dentro de
`useEffect`, por lo que la respuesta HTML inicial solo contenía el estado de carga y no
incluía productos ni un encabezado principal. No existían las rutas nativas `robots.ts` y
`sitemap.ts`. La metadata raíz era genérica, varias páginas públicas no tenían metadata
propia, las áreas privadas no declaraban `noindex` y la ruta histórica `/product/[id]`
renderizaba el mismo detalle que la URL canónica basada en slug.

La ruta canónica vigente es `/producto/[slug]`. El catálogo público se obtiene desde
`GET /products`; el detalle usa `GET /products/slug/:slug`; la compatibilidad histórica
resuelve `GET /products/:id`; y el branding público usa `GET /public/branding`.

## 2. Arquitectura SEO implementada

- Server Components obtienen los datos iniciales de portada y producto.
- Los carruseles, carrito, sliders y demás eventos de navegador permanecen en Client
  Components y reciben datos iniciales serializables.
- Las URLs públicas, metadata, categorías y JSON-LD reutilizable se centralizan en
  utilidades pequeñas, sin dependencias SEO adicionales.
- Next.js genera de forma nativa `/robots.txt` y `/sitemap.xml`.
- Los scripts JSON-LD reutilizan el nonce generado por la CSP.

## 3. URL base y variables

`NEXT_PUBLIC_SITE_URL` es la fuente configurable de la URL pública del frontend. Su
valor de ejemplo local es `http://localhost:3000`. En producción debe contener el dominio
comercial definitivo, por ejemplo `https://www.pcsystemstore.com`.

La utilidad `lib/site-url.ts` elimina barras finales, exige HTTP(S), evita localhost en
producción y construye URLs absolutas. `NEXT_PUBLIC_API_URL` continúa siendo la URL del
backend; su ejemplo local es `http://localhost:3001`.

## 4. robots.txt

`app/robots.ts` permite las rutas públicas, enlaza el sitemap absoluto y excluye los
segmentos `/admin`, `/auth`, `/checkout`, `/mi-cuenta` y `/api`, incluyendo sus rutas
hijas. Esta política complementa los controles de acceso; no los sustituye.

## 5. sitemap.xml

`app/sitemap.ts` combina:

- páginas públicas estáticas existentes;
- categorías enumeradas por la navegación real;
- productos confirmados por la API que tengan un slug válido.

No incluye rutas privadas, búsquedas, parámetros, `/product/[id]` ni productos sin slug.
Solo publica `lastModified` cuando `updatedAt` es una fecha válida. La ruta es dinámica y
el catálogo se revalida cada cinco minutos. Si la API no está disponible se registra una
advertencia segura y se entrega el conjunto estático y de categorías, sin inventar
productos ni impedir `next build`.

## 6. Renderizado de portada

`app/page.tsx` es ahora un Server Component. Entrega un único `h1` con la utilidad accesible
`sr-only`, enlaces de categorías y una selección inicial real del catálogo, sin introducir
un bloque SEO visible ni reservar espacio en el layout. `HomePageClient` conserva el diseño
y la interactividad de los carruseles, pero ya no repite la petición inicial en el navegador.
Los banners públicos también llegan desde el servidor, por lo que el primer HTML contiene
el banner real y no un placeholder oscuro vacío. El catálogo y los banners iniciales se
revalidan cada 60 segundos para no mantener contenido obsoleto durante periodos largos.

## 7. Metadata por ruta

- `/`: componentes, laptops, hardware y configurador.
- `/tienda`: catálogo general.
- `/ofertas`: productos con precios promocionales disponibles.
- `/categoria/[...slug]`: título, descripción y canonical según la categoría real.
- `/producto/[slug]`: nombre, descripción, imágenes HTTPS y canonical del producto real.
- Páginas informativas existentes: contacto, ayuda, garantías, medios de pago, privacidad,
  reembolsos, quiénes somos y términos.
- `/armar-pc`: metadata específica del configurador.

Una categoría desconocida devuelve 404; una búsqueda interna dentro de la ruta de
categoría declara `noindex`.

## 8. Estrategia canonical

Las páginas públicas usan canonicals absolutas construidas desde la URL base central.
Los enlaces de producto apuntan exclusivamente a `/producto/[slug]`. No se generan
canonicals con ID, `undefined`, filtros o búsquedas.

## 9. Redirección de ruta antigua

`/product/[id]` consulta el producto real, comprueba que tenga slug y ejecuta
`permanentRedirect` hacia `/producto/<slug>`. Un ID inexistente devuelve 404 y un fallo
temporal de API conserva su condición de error, en vez de fingir que el recurso no existe.

## 10. Política noindex

Layouts de segmento aplican `index: false`, `follow: false` y `nocache: true` a:

- `/admin` y todas sus rutas hijas;
- `/auth` y todas sus rutas hijas;
- `/checkout` y todas sus rutas hijas;
- `/mi-cuenta` y todas sus rutas hijas.

Los guards, sesiones y autorizaciones existentes no fueron modificados.

## 11. JSON-LD implementado

- `Organization` en la portada, usando nombre/logo del branding público y los datos de
  contacto publicados por PCSystemStore.
- `Product` y `Offer` en el detalle canónico, con nombre, descripción limpia, imágenes,
  SKU disponible, marca cuando existe en las especificaciones, categoría, precio efectivo
  en PEN y disponibilidad derivada del stock.
- `BreadcrumbList` en categorías y productos, con posiciones consecutivas y URLs absolutas.

La serialización escapa caracteres capaces de cerrar el elemento `script`. Cada script
recibe el nonce de la CSP; no se habilitó `unsafe-inline`.

El navegador oculta deliberadamente el valor de `nonce` al consultar el atributo en el DOM:
la respuesta HTTP conserva un valor no vacío y la directiva `script-src 'nonce-…'` contiene
exactamente el mismo valor. Como React comparaba ese valor oculto (`nonce=""`) con la propiedad
servidora, los elementos JSON-LD usan `suppressHydrationWarning` únicamente en su propio
`<script type="application/ld+json">`. No existe una segunda generación del nonce ni una
supresión global asociada a esta corrección.

## 12. Campos omitidos por no existir datos

No se añadieron `review`, `aggregateRating`, reseñas, puntuaciones, preventa ni estados de
inventario no expuestos por el backend. `itemCondition` se omitió al no existir un campo
público que confirme la condición por producto. La marca se omite cuando no está presente
en las especificaciones reales. No se inventan imágenes ni fechas de actualización.

## 13. Estrategia de caché y revalidación

- Portada, producto y relacionados: revalidación de 60 segundos.
- Branding y catálogo del sitemap: revalidación de 300 segundos.
- Sitemap: generación dinámica para tolerar que Railway no esté accesible durante el build.
- Las peticiones de producto distinguen 404 de errores de red o configuración.

## 14. Pruebas

Vitest cubre normalización de URL, prevención de localhost en producción, canonicals,
rutas privadas de robots, generación segura de enlaces de producto, metadata de categoría,
`noindex` y serialización segura de JSON-LD. La validación de entrega se completa con
`next build`, ejecución en modo producción y comprobaciones HTTP sobre el HTML fuente.

## 15. Pasos posteriores al despliegue

1. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio comercial en Vercel.
2. Confirmar que `NEXT_PUBLIC_API_URL` apunta al backend público HTTPS.
3. Redesplegar el frontend.
4. Verificar públicamente `/robots.txt`, `/sitemap.xml`, canonicals y código fuente.
5. Enviar `/sitemap.xml` en Google Search Console.
6. Validar portada, categorías y productos con la prueba de resultados enriquecidos.

Estos pasos son manuales; esta implementación no modifica Vercel, Railway ni Google.

## 16. Riesgos residuales

- La disponibilidad de productos dinámicos en portada y sitemap depende de que el backend
  público sea alcanzable desde Vercel y de una `NEXT_PUBLIC_API_URL` correcta.
- La variable de producción debe usar el dominio comercial definitivo para evitar que un
  dominio de preview aparezca en canonicals.
- Conviene vigilar el tamaño del sitemap si el catálogo crece lo suficiente como para
  requerir particiones de sitemap.
- Los resultados enriquecidos dependen de la calidad y continuidad de los datos reales de
  precio, stock, slug e imágenes entregados por el backend.
- La información de compatibilidad de Browserslist se mantiene en `pnpm-lock.yaml`; después
  de actualizar `caniuse-lite` se comprobó que `pnpm install --frozen-lockfile` continúa
  siendo reproducible.
