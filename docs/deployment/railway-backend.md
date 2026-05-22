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

Si el proyecto aun no usa migraciones formales, ejecutar `npm run prisma:push` manualmente una vez para staging inicial y luego adoptar migraciones antes de produccion estable.

## Variables requeridas

```env
DATABASE_URL=
DIRECT_URL=
NODE_ENV=production
PORT=3000
JWT_SECRET=
FRONTEND_URL=
CORS_ORIGINS=
AI_SERVICE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Neon:

- `DATABASE_URL`: URL pooled con `-pooler`. La usa NestJS runtime mediante `@prisma/adapter-pg`.
- `DIRECT_URL`: URL directa sin `-pooler`. La usa Prisma CLI desde `prisma.config.ts`.
- Ambas deben usar `sslmode=require`.

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
