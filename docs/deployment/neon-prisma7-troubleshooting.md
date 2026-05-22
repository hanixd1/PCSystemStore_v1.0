# Neon + Prisma 7 Troubleshooting

Este documento resume la configuracion de PCSystemStore para Prisma 7, NeonDB y Railway.

## Variables

```env
DATABASE_URL=
DIRECT_URL=
```

- `DATABASE_URL`: URL pooled de Neon, con host que contiene `-pooler`. La usa NestJS en runtime.
- `DIRECT_URL`: URL directa de Neon, sin `-pooler`. La usa Prisma CLI desde `prisma.config.ts`.

Ambas deben usar credenciales reales, database correcto y `sslmode=require`. No guardar `.env` en Git.

## Comandos locales

```powershell
cd backend
npm install
npm run prisma:version
npm run prisma:validate
npm run prisma:generate
npm run build
```

Para probar cambios contra Neon:

```powershell
npm run prisma:push
```

Si el proyecto ya usa migraciones formales:

```powershell
npm run prisma:migrate:deploy
```

## P1001

Si aparece `P1001`, validar primero conectividad TCP:

```powershell
Test-NetConnection HOST-pooler.REGION.aws.neon.tech -Port 5432
Test-NetConnection HOST.REGION.aws.neon.tech -Port 5432
```

Acciones recomendadas:

- Despertar Neon desde SQL Editor con `SELECT 1;`.
- Copiar nuevamente el snippet desde Neon `Connect` con `Show password`.
- Resetear la password del role si hay duda.
- Probar una red distinta si el puerto `5432` esta bloqueado localmente.
- Probar temporalmente `DIRECT_URL` igual a `DATABASE_URL` para distinguir problema de host directo vs pooled.
- Probar temporalmente quitar `channel_binding=require` y dejar solo `sslmode=require`.

## Railway

En Railway, definir:

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

Build Command:

```bash
npm ci && npm run prisma:generate && npm run build
```

Start Command:

```bash
npm run prisma:migrate:deploy && npm run start:prod
```
