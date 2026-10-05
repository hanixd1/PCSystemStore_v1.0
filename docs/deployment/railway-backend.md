# Railway Backend Deployment

## Servicio

Root Directory:

```text
backend
```

Build Command:

```bash
npm ci && npm run prisma:generate && npm run build
```

Start Command:

```bash
npm run prisma:migrate:deploy && npm run start:prod
```

Production usa migraciones versionadas. No ejecutar `prisma db push` ni seeds
para desplegar el schema de producción.

## Variables requeridas

```env
DATABASE_URL=
DIRECT_URL=
NODE_ENV=production
JWT_SECRET=
FRONTEND_URL=https://www.pcsystemstore.com
CORS_ORIGIN=
CORS_ORIGINS=https://www.pcsystemstore.com,https://pcsystemstore.com
CSRF_ALLOWED_ORIGINS=https://www.pcsystemstore.com,https://pcsystemstore.com
RATE_LIMIT_KEY_SECRET=
TRUST_PROXY=1
COOKIE_SAME_SITE=none
APP_VERSION=
COMMIT_SHA=
AI_SERVICE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

No definas un `PORT` fijo: Railway inyecta un puerto dinámico y el backend lo
lee desde `process.env.PORT`. Configura el Healthcheck Path como `/health`; esta
ruta comprueba que la API esté escuchando y no depende de la base de datos.

Neon:

- `DATABASE_URL`: URL pooled con `-pooler`. La usa NestJS runtime mediante `@prisma/adapter-pg`.
- `DIRECT_URL`: URL directa sin `-pooler`. La usa Prisma CLI desde `prisma.config.ts`.
- Ambas deben usar `sslmode=verify-full&channel_binding=require`.

## Prisma 7

`backend/prisma/schema.prisma` no debe contener `url` ni `directUrl` en el datasource.

La URL de migraciones se configura en:

```text
backend/prisma.config.ts
```

`@prisma/client`, `prisma`, `@prisma/config` y `@prisma/adapter-pg` deben mantenerse en la misma version major `7.x`.

## Verificacion previa local

```bash
cd backend
npm install
npm run prisma:version
npm run prisma:validate
npm run prisma:generate
npm run build
```

El build actual de NestJS genera `dist/src/main.js`, por eso `start:prod` debe mantenerse como:

```json
"start:prod": "node dist/src/main.js"
```
