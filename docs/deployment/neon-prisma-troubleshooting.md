# Neon + Prisma 7 Troubleshooting

## Configuracion esperada

El backend usa Prisma 7 con `prisma.config.ts`. En Prisma 7, `url` y `directUrl` no deben estar en `backend/prisma/schema.prisma`.

`backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

`backend/prisma.config.ts` carga `.env` y usa `DIRECT_URL` para comandos Prisma CLI. Si `DIRECT_URL` no existe, usa `DATABASE_URL` como fallback.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

- `DATABASE_URL`: URL pooled de Neon para runtime de NestJS.
- `DIRECT_URL`: URL directa de Neon para `prisma db push` y migraciones.
- No guardar credenciales reales en Git.

## Verificar versiones

Ejecutar siempre desde `backend/`:

```powershell
npm run prisma:version
npm run prisma:validate
npm run prisma:generate
```

El resultado esperado debe mostrar Prisma CLI y `@prisma/client` en la misma version major `7.x`.

## Diagnostico de P1001

`P1001` significa que Prisma no puede abrir conexion TCP al host PostgreSQL configurado. No es un problema de `schema.prisma` si `prisma validate` y `prisma generate` pasan.

Comprobar conectividad sin exponer secretos:

```powershell
Test-NetConnection HOST-pooler.REGION.aws.neon.tech -Port 5432
Test-NetConnection HOST.REGION.aws.neon.tech -Port 5432
```

Si falla:

- Abrir Neon Dashboard y confirmar que el Compute esta activo.
- Entrar al SQL Editor de Neon y ejecutar `SELECT 1;` para despertar el compute.
- En Neon, usar `Connect` -> `Show password` -> copiar de nuevo el snippet.
- Si hay duda, resetear la password del role usado por la URL.
- Probar otra red si el ISP/firewall bloquea salida a `5432`.
- Para diagnostico temporal, probar `DIRECT_URL` igual a `DATABASE_URL`.
- Para diagnostico temporal, probar URL con solo `?sslmode=require` si `channel_binding=require` falla.

## Prisma CLI vs runtime

- Prisma CLI usa `datasource.url` definido en `prisma.config.ts`; debe apuntar preferentemente a `DIRECT_URL`.
- NestJS runtime usa `DATABASE_URL` mediante `@prisma/adapter-pg` en `PrismaService`; debe apuntar a la URL pooled.

## Db push vs migrate deploy

No ejecutar ambos a ciegas.

- Usar `npm run prisma:push` para sincronizacion inicial sin migraciones formales.
- Usar `npm run prisma:migrate:deploy` si ya existen migraciones versionadas en `backend/prisma/migrations`.
