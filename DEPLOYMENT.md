# Despliegue Cloud - PCSystemStore

Arquitectura objetivo:

- `frontend/`: Next.js en Railway (antes Vercel; la seccion 4 aplica igual a Railway).
- `backend/`: NestJS + Prisma en Railway.
- `ai-service/`: FastAPI en Railway.
- PostgreSQL: Neon.
- Imagenes: Cloudinary.

## 1. Base de datos en Neon

1. Crear un proyecto PostgreSQL en Neon.
2. Crear una branch para produccion y, opcionalmente, otra para QA/staging.
3. Copiar el connection string con SSL.
4. Configurar en Railway:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

`DIRECT_URL` queda disponible para despliegues que lo requieran, aunque el schema actual usa `DATABASE_URL`.

## 2. Backend en Railway

Configurar un servicio Railway apuntando a la carpeta `backend`.

Variables requeridas:

```env
NODE_ENV=production
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://www.pcsystemstore.com
CORS_ORIGIN=
CORS_ORIGINS=https://www.pcsystemstore.com,https://pcsystemstore.com
CSRF_ALLOWED_ORIGINS=https://www.pcsystemstore.com,https://pcsystemstore.com
RATE_LIMIT_KEY_SECRET=
TRUST_PROXY=1
COOKIE_SAME_SITE=none
AI_SERVICE_URL=https://tu-ai-service.up.railway.app
# Mismo valor que INTERNAL_API_KEY del ai-service (openssl rand -hex 32).
INTERNAL_API_KEY=
GOOGLE_CLIENT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PAYMENT_COMMISSION_RATE=0.04
```

No fijar `PORT` en Railway: la plataforma lo inyecta para cada deployment y el
backend escucha ese valor en `0.0.0.0`. Configurar el Healthcheck Path como
`/health`.

Build y start esperados:

```bash
npm install
npx prisma generate
npm run build
npx prisma migrate deploy
npm run start:prod
```

Health check:

```text
GET /health
GET /health/db
```

## 3. AI Service en Railway

Configurar un servicio Railway apuntando a la carpeta `ai-service` (Python 3.12, ver
`runtime.txt` y `.python-version`). Comando de arranque:
`uvicorn main:app --host 0.0.0.0 --port $PORT`. No ejecutar `uvicorn.run(...)` dentro de `main.py`.

Variables:

```env
ENVIRONMENT=production
# Secreto compartido con el backend: sin el, /chat y /forecast responden 503 en produccion.
INTERNAL_API_KEY=
# true: al arrancar carga las series y el modelo en segundo plano (~15 s con Chronos). Mientras
# tanto /forecast/stock-coverage responde 503 con Retry-After y el backend usa su modo local.
FORECAST_WARM_UP=true
# Carpeta del volumen privado con las series del pronostico (ver abajo). Sin ella se usa
# pronostico/data/service/03_series, que no existe en Railway.
PCS_SERVICE_SERIES=/data/forecast
# Opcional: raiz del proyecto de pronostico (por defecto ai-service/pronostico).
# PCS_PROJECT_ROOT=
```

Dependencias: `requirements.txt` instala solo lo necesario para servir (numpy, pandas, pyarrow,
pydantic, FastAPI); el pronostico usa SES. `requirements-forecast.txt` agrega PyTorch y
`chronos-forecasting` para Chronos (imagen de varios GB, y los pesos de `models_cache` deben
estar en el volumen). Las librerias de investigacion (LightGBM, pdfplumber, scipy...) quedan en
el extra `research` de `pronostico/pyproject.toml` y nunca se instalan en produccion.

Endpoints (todos menos `/health` exigen `X-Internal-API-Key`):

| Metodo | Ruta | Uso |
| --- | --- | --- |
| GET | `/health` | Health check de Railway (publico). |
| POST | `/chat` | Chatbot Puchi; el backend envia el mensaje y el catalogo. |
| GET | `/forecast/health` | Modelo cargado y ultimo mes con datos. |
| GET | `/forecast/overview` | Rango de meses pronosticables y horizontes validados. |
| GET | `/forecast/month?month=YYYY-MM&threshold=N` | Unidades esperadas, probabilidades, categorias y productos. |
| POST | `/forecast/stock-coverage` | Riesgo de quiebre por categoria (dashboard de inventario). |
| GET | `/forecast/research` | Resultados de la prueba final de la tesis. |

Seguridad:

- Solo el backend llama al ai-service: `/chat` y `/forecast/*` exigen la cabecera
  `X-Internal-API-Key`. No hay CORS (ningun origen de navegador esta permitido).
- Fuera de `ENVIRONMENT=development|dev|local|test` (incluido `staging`) se desactivan `/docs`,
  `/redoc` y `/openapi.json` y la clave interna es obligatoria.

Datos del pronostico: `ai-service/pronostico/data/` y `outputs/` nunca van a Git (datos de la
empresa). Para desplegar:

1. En la maquina con los datos: `cd ai-service/pronostico` y
   `python -m pcsforecast.service.bundle /ruta/bundle`. Copia las series mensuales agregadas
   (sin clientes) y escribe `research_results.json` con las tablas de la prueba final.
2. En Railway, crear un volumen en el servicio ai-service montado en `/data` y subir la carpeta
   a `/data/forecast` (por ejemplo con `railway ssh` o un deploy temporal).
3. Definir `PCS_SERVICE_SERIES=/data/forecast` y redeployar.

Sin volumen, `/forecast/*` responde 503 y el backend degrada a su modo local. CI no necesita
datos: las pruebas generan una tienda sintetica (`pcsforecast.service.synthetic`).

Health check: `GET /health`.

## 4. Frontend en Vercel

Configurar un proyecto Vercel apuntando a la carpeta `frontend`.

Variables:

```env
NEXT_PUBLIC_API_URL=https://pcsystemstorebackend-production.up.railway.app
NEXT_PUBLIC_SITE_URL=https://www.pcsystemstore.com
NEXT_PUBLIC_APP_VERSION=0.1.0
# NEXT_PUBLIC_COMMIT_SHA se completa desde VERCEL_GIT_COMMIT_SHA durante el build.
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_STORE_MAP_QUERY=PCSystemStore Huancayo Peru
NEXT_PUBLIC_STORE_ADDRESS=Direccion real del local, Huancayo, Peru
NEXT_PUBLIC_WHATSAPP_NUMBER=51959139676
```

Para el mapa de `/tienda`, restringir la API key en Google Cloud:

- HTTP referrers: `https://www.pcsystemstore.com/*`
- Si se mantiene el apex como redirect: `https://pcsystemstore.com/*`
- API restrictions: solo `Maps Embed API`

Despues de cambiar variables `NEXT_PUBLIC_*` en Vercel, ejecutar un redeploy porque se inyectan durante build.

Build esperado:

```bash
pnpm install
pnpm run build
```

## 5. Cloudinary

Crear cuenta o proyecto en Cloudinary y configurar en Railway backend:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

No subir secretos a GitHub. Usar solo `.env.example` como referencia.

## 6. Prueba local

Terminal 1:

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd backend
npm install
npx prisma generate
npm run start:dev
```

Terminal 3:

```powershell
cd frontend
npm install
npm run dev
```

Variables locales recomendadas:

Backend:

```env
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
CORS_ORIGINS=http://localhost:3001
```

En produccion Railway:

```env
AI_SERVICE_URL=https://pcsystemstore-ai-production.up.railway.app
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

En desarrollo local, `NEXT_PUBLIC_API_URL` apunta al backend NestJS en `3000`.

### Docker Compose (QA local)

Hay `Dockerfile.local` en `backend/`, `frontend/` y `ai-service/`, y un compose en `docs/`. No
se llaman `Dockerfile` a proposito: Railway usa automaticamente un `Dockerfile` de la carpeta del
servicio en lugar de Railpack, y con el ejecuta el start command del panel sin shell (`$PORT` y
`&&` dejan de funcionar). Los servicios de Railway siguen construyendose con Railpack.

```bash
docker compose -f docs/docker-compose.yml --profile local-db up --build
```

Levanta PostgreSQL (perfil `local-db`), ai-service (sin puerto publico, solo lo llama el
backend), backend en `3000` y frontend en `3001`. Las series del pronostico se montan de
`FORECAST_DATA_DIR` (por defecto `ai-service/pronostico/data/service/03_series`). Antes del
primer uso aplicar las migraciones desde el host (la imagen no incluye el CLI de Prisma):
`cd backend && DIRECT_URL=postgresql://pcsystemstore:pcsystemstore_password@localhost:5432/pcsystemstore_qa npx prisma migrate deploy`.

## 7. Validacion funcional post-deploy

1. Abrir home.
2. Revisar catalogo y filtros.
3. Probar login cliente.
4. Probar login admin.
5. Crear producto desde admin.
6. Subir imagen a Cloudinary.
7. Agregar al carrito.
8. Ejecutar checkout.
9. Revisar pagos manuales.
10. Abrir dashboard o modulo que use prediccion IA.
11. Verificar `backend /health`.
12. Verificar `ai-service /health`.

## 8. Costos en Railway (plan Hobby, USD 5 incluidos)

Railway cobra RAM por minuto, CPU y egress publico. Lo que ya hace el codigo:

- **Backend:** gzip en todas las respuestas JSON (`compression`, umbral 1 KB). Los listados
  publicos usan `GET /products?view=card` (sin las 26 tablas de specs ni la descripcion) y las
  opciones de filtro se reutilizan 60 s. Las lecturas publicas responden
  `Cache-Control: private, no-cache` con ETag: el navegador siempre revalida, pero si nada cambio
  recibe `304` sin cuerpo. Las CDN siguen sin poder cachearlas (`CDN-Cache-Control: no-store`).
- **Frontend:** el SSR usa `INTERNAL_API_URL` si existe (red privada, sin egress) y las fichas de
  producto se cachean 15 s en el servidor de Next.
- **ai-service:** sirve los resultados de Chronos sin PyTorch (`precomputed_quantiles.json`) y lee
  paneles recortados del bundle: ~160 MB de RAM en lugar de ~600 MB (series completas) o ~1,1 GB
  (Chronos cargado). `python serve.py` escucha IPv4 e IPv6 a la vez.

Pasos en el panel de Railway (no los puede hacer el codigo):

1. **Red privada backend -> ai-service.** En el backend: `AI_SERVICE_URL=http://<ai-service>.railway.internal:<PORT>`
   (el nombre interno sale en Settings -> Networking del ai-service). Comprobar que el dashboard de
   inventario y el chatbot responden y, recien entonces, quitar el dominio publico del ai-service
   (Settings -> Networking -> Public Networking). Para la red privada conviene cambiar su start
   command (Settings -> Deploy) a `python serve.py`, que escucha IPv4 e IPv6; `uvicorn --host 0.0.0.0`
   solo escucha IPv4.
2. **Red privada frontend -> backend (SSR).** En el frontend: `INTERNAL_API_URL=http://<backend>.railway.internal:<PORT>`.
   El backend escucha en `::` (IPv4 + IPv6). `NEXT_PUBLIC_API_URL` sigue siendo la URL publica,
   porque la usa el navegador.
3. **Heap de Node.** `NODE_OPTIONS=--max-old-space-size=256` en el backend y `=384` en el frontend.
   No usar 160: la importacion masiva (Excel de hasta 2 000 filas) y el SSR de Next pueden
   quedarse sin memoria y reiniciar el servicio, que cuesta mas que lo que ahorra.
4. **App Sleeping solo en el ai-service.** Duerme tras ~10 min sin trafico; al despertar (unos
   segundos) el dashboard usa su modo local y el chatbot puede contestar "no disponible" una vez.
   No activarlo en el backend: es el que sirve la tienda y su primer visitante esperaria el
   arranque en frio.
5. **No instalar `requirements-forecast.txt` en Railway.** PyTorch + Chronos ocupan ~1,1 GB de RAM.
   Los resultados de Chronos llegan precalculados:

```bash
cd ai-service/pronostico
python -m pcsforecast.service.fit          # opcional: reajusta Chronos con meses nuevos
python -m pcsforecast.service.precomputed  # escribe precomputed_quantiles.json (~15 KB)
python -m pcsforecast.service.bundle /ruta/bundle   # paneles recortados + cuantiles + resultados
```

Subir la carpeta al volumen y fijar `PCS_SERVICE_SERIES`. Si el archivo no coincide con las series
(otro ultimo mes), el servicio lo ignora y usa SES; `/forecast/overview` muestra el modelo activo.

Opcional: con Cloudflare en modo proxy (nube naranja, SSL "Full") para `www`, los archivos
estaticos de Next (`/_next/static`) se servirian desde Cloudflare y bajaria el egress del frontend.
Probarlo primero, porque cambia certificados y cabeceras.

## 9. Riesgos y pendientes

- Produccion requiere dominios definitivos, HTTPS, monitoreo y alertas.
- HTTP E2E completo depende de una DB QA real.
- Sin PyTorch el pronostico usa SES como respaldo; Chronos requiere `requirements-forecast.txt` y los pesos en `models_cache` (no versionados).
- Si `AI_SERVICE_URL` falla o no esta configurado, el backend degrada sin romper el e-commerce y devuelve predicciones vacias.
- Mantener migraciones Prisma versionadas y ejecutar `npx prisma migrate deploy` en Railway.
# Seguridad de frontend y API

La topologia Vercel (frontend) -> Railway (API) es cross-site. Configure en Railway `CORS_ORIGINS` y `CSRF_ALLOWED_ORIGINS` con la URL HTTPS exacta de Vercel, `COOKIE_SAME_SITE=none` y `TRUST_PROXY=1`. No agregue localhost en produccion. Si se asignan subdominios bajo el mismo sitio registrable, cambie a `COOKIE_SAME_SITE=lax` despues de probar OAuth y autenticacion.

Antes de promover una version aplique `prisma migrate deploy`. En multiples replicas, sustituya el storage en memoria de throttling por uno compartido. Consulte `docs/security-hardening.md` para variables, limites y verificaciones.
