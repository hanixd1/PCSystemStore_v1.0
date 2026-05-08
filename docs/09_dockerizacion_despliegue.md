# Dockerización y Despliegue de Módulos - PCSystemStore

## 10.1 Introducción a Docker en el Proyecto

Docker se incorpora a PCSystemStore como mecanismo de empaquetado reproducible para los módulos principales del sistema: backend NestJS y frontend Next.js. En este proyecto, Docker no reemplaza las pruebas ni convierte automáticamente el sistema en producción final; su objetivo inicial es facilitar ambientes de QA/staging controlados, reducir diferencias entre máquinas de desarrollo y documentar una base técnica de despliegue.

La dockerización aporta portabilidad, mantenibilidad y repetibilidad. Cada módulo declara sus dependencias, comandos de build, puertos y variables de entorno esperadas. Esto permite levantar el sistema de forma más consistente para validaciones técnicas, sustentación, revisión QA y pruebas preproductivas.

## 10.2 Dockerización del Backend

El backend está desarrollado con NestJS, TypeScript, Prisma y PostgreSQL. El archivo `backend/Dockerfile` usa una imagen Node LTS basada en Debian slim, instala dependencias, ejecuta `prisma generate`, compila el backend y expone el servicio en el puerto configurado.

| Elemento | Descripción |
|---|---|
| Imagen base | `node:22-bookworm-slim` |
| Framework | NestJS |
| ORM | Prisma |
| Base de datos | PostgreSQL externo, recomendado Neon para QA/staging |
| Puerto interno | `3002` |
| Build | `npm ci`, `npx prisma generate`, `npm run build` |
| Comando runtime | `node dist/main.js` |
| Variables clave | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGIN`, `CORS_ORIGINS`, `PORT` |
| IA Python | Se instala Python 3 y `backend/requirements.txt`; si el predictor requiere más librerías o modelos, debe validarse en una fase posterior |

El contenedor no incluye ni debe incluir secretos reales. La conexión a PostgreSQL se resuelve mediante `DATABASE_URL`, que puede apuntar a una base Neon externa o a un PostgreSQL local de QA.

## 10.3 Dockerización del Frontend

El frontend usa Next.js, React y Tailwind. El archivo `frontend/Dockerfile` instala dependencias con pnpm, compila el sitio con `pnpm run build` y ejecuta `pnpm start` en el puerto `3000`.

| Elemento | Descripción |
|---|---|
| Imagen base | `node:22-bookworm-slim` |
| Framework | Next.js |
| Gestor | pnpm mediante Corepack |
| Puerto interno | `3000` |
| Build | `pnpm install --frozen-lockfile`, `pnpm run build` |
| Comando runtime | `pnpm start` |
| Variable pública | `NEXT_PUBLIC_API_URL` |

`NEXT_PUBLIC_API_URL` debe definirse por entorno. En QA/local puede ser `http://localhost:3002`; en staging real debe apuntar al dominio o URL pública del backend.

## 10.4 Orquestación con Docker Compose

El archivo `docker-compose.yml` define tres servicios. Compose no carga `.env.example` como archivo real de entorno; esos archivos son solo plantillas. Para QA/staging se debe crear un `.env` local no versionado o exportar variables en el entorno.

| Servicio | Uso | Estado |
|---|---|---|
| `backend` | API NestJS de PCSystemStore | Principal |
| `frontend` | Aplicación pública/admin Next.js | Principal |
| `postgres` | PostgreSQL local para QA/desarrollo | Opcional mediante profile `local-db` |

Por defecto, Compose levanta backend y frontend. Para usar Neon externo, se debe configurar `DATABASE_URL` apuntando a Neon y no activar el servicio `postgres`.

Para usar PostgreSQL local opcional:

```bash
docker compose --profile local-db up -d
```

En ese caso, `DATABASE_URL` debe apuntar al contenedor local, por ejemplo:

```env
DATABASE_URL=postgresql://pcsystemstore:pcsystemstore_password@postgres:5432/pcsystemstore_qa?schema=public
```

Comandos principales:

```bash
docker compose build
docker compose up
docker compose up -d
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```

Validar configuración:

```bash
docker compose config
```

## 10.5 Variables de Entorno y Seguridad

El proyecto debe usar `.env.example` como plantilla, no como fuente de secretos reales. Los archivos `.env`, `.env.local`, `.env.test` y equivalentes no deben subirse al repositorio.

Variables principales del backend:

| Variable | Propósito |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL/Neon |
| `DATABASE_URL_TEST` | Base aislada para pruebas HTTP/E2E |
| `JWT_SECRET` | Firma de tokens JWT |
| `PORT` | Puerto del backend |
| `FRONTEND_URL` | URL del frontend permitida |
| `CORS_ORIGIN` / `CORS_ORIGINS` | Orígenes permitidos por CORS |
| `PYTHON_EXECUTABLE` | Binario Python usado por IA si aplica |
| `CLOUDINARY_*` | Credenciales de carga de imágenes |

Variables principales del frontend:

| Variable | Propósito |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública del backend consumida por Next.js |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ID público de Google OAuth si se usa |

Esta práctica se alinea parcialmente con ISO/IEC 27001 al separar secretos de código fuente y reducir exposición accidental de credenciales.

## 10.6 Relación con Calidad y Normas

| Norma/modelo | Relación con Dockerización |
|---|---|
| ISO/IEC 25010 | Mejora portabilidad, mantenibilidad y fiabilidad al estandarizar entornos |
| ISO/IEC 27001 | Apoya la gestión segura de configuración y separación de secretos |
| ISO 9001 | Contribuye a reproducibilidad, control de proceso y trazabilidad técnica |

No se afirma certificación ISO. La documentación plantea alineación y aplicación parcial de criterios útiles para ingeniería y QA.

## 10.7 Limitaciones Actuales

| Limitación | Impacto |
|---|---|
| Docker no equivale a producción lista | Aún faltan HTTPS, dominio, observabilidad, backups y hardening |
| `DATABASE_URL_TEST` sigue siendo requisito para HTTP E2E real | Sin DB QA no se puede afirmar aprobación E2E completa |
| Pagos reales fuera de alcance | El sistema usa pagos simulados/manuales |
| IA Python puede requerir imagen especializada | Si el predictor necesita más dependencias, conviene separar un servicio IA |
| PostgreSQL local es opcional | Para staging se recomienda Neon branch/base separada |
| Migraciones no se ejecutan automáticamente en runtime | Deben aplicarse de forma controlada antes de levantar staging |

## 10.8 Conclusión

La dockerización propuesta prepara PCSystemStore para QA/staging controlado y mejora la reproducibilidad del despliegue de backend y frontend. La arquitectura mantiene compatibilidad con Neon PostgreSQL externo y ofrece PostgreSQL local opcional para pruebas. Antes de producción se deben completar pruebas críticas, configurar HTTPS/dominio, monitoreo, backups, secretos seguros y validación real de IA, pagos manuales, stock y seguridad.
