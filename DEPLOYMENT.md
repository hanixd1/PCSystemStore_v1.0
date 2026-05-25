# Despliegue Cloud - PCSystemStore

Arquitectura objetivo:

- `frontend/`: Next.js en Vercel.
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
PORT=3000
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://tu-frontend.vercel.app
CORS_ORIGIN=https://tu-frontend.vercel.app
CORS_ORIGINS=https://tu-frontend.vercel.app
AI_SERVICE_URL=https://tu-ai-service.up.railway.app
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PAYMENT_COMMISSION_RATE=0.04
```

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

Configurar un servicio Railway apuntando a la carpeta `ai-service`.

Variables:

```env
PORT=8000
MODEL_PATH=
ENVIRONMENT=production
```

Nota de preparacion futura: en local usar `127.0.0.1`. En despliegue cloud,
el proveedor indicara el comando de arranque correspondiente para exponer el
servicio segun su runtime. No ejecutar `uvicorn.run(...)` dentro de `main.py`.

Health check:

```text
GET /health
```

Contrato principal:

```text
POST /predict-stock
```

Si no existe un modelo entrenado, el servicio usa reglas de negocio para clasificar riesgo de stock.

## 4. Frontend en Vercel

Configurar un proyecto Vercel apuntando a la carpeta `frontend`.

Variables:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_STORE_MAP_QUERY=PCSystemStore Huancayo Peru
NEXT_PUBLIC_STORE_ADDRESS=Direccion real del local, Huancayo, Peru
NEXT_PUBLIC_WHATSAPP_NUMBER=51959139676
```

Para el mapa de `/tienda`, restringir la API key en Google Cloud:

- HTTP referrers: `https://pc-system-store-frontend.vercel.app/*`
- Futuro dominio: `https://tudominio.com/*` y `https://www.tudominio.com/*`
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
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

En produccion Railway:

```env
AI_SERVICE_URL=https://pcsystemstore-ai-production.up.railway.app
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Ajustar `NEXT_PUBLIC_API_URL` al puerto real del backend si no usa `3000`.

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

## 8. Riesgos y pendientes

- Produccion requiere dominios definitivos, HTTPS, monitoreo y alertas.
- HTTP E2E completo depende de una DB QA real.
- El microservicio IA usa reglas como fallback hasta integrar un modelo entrenado desde `MODEL_PATH`.
- Si `AI_SERVICE_URL` falla o no esta configurado, el backend degrada sin romper el e-commerce y devuelve predicciones vacias.
- Mantener migraciones Prisma versionadas y ejecutar `npx prisma migrate deploy` en Railway.
