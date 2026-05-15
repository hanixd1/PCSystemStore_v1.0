# 14. Implementación y Monitoreo

## 14.1 Preparación del Entorno de Implementación

La implementación de PCSystemStore requiere separar configuración local, QA/staging y producción futura. No se deben usar bases ni secretos productivos durante QA.

| Elemento | Configuración requerida | Estado actual | Observación |
|---|---|---|---|
| Backend | Node/NestJS, `DATABASE_URL`, `JWT_SECRET`, CORS, puerto. | Dockerfile creado; build OK. | Requiere secretos reales fuera del repo |
| Frontend | Next.js, `NEXT_PUBLIC_API_URL`, build estático/SSR. | Dockerfile creado; build OK. | URL API cambia por entorno |
| Base de datos | PostgreSQL/Neon externo o Postgres local QA. | Preparado. | `DATABASE_URL_TEST` pendiente |
| Docker | Backend, frontend y Compose. | `docker compose config` OK. | `compose build/up` no ejecutado |
| Neon | Branch/base separada para QA. | Recomendado. | No configurado en este entorno |
| Cloudinary/uploads | Variables `CLOUDINARY_*`. | Plantilla en `.env.example`. | No incluir secretos |
| Python/IA | `PYTHON_EXECUTABLE` y dependencias. | Python documentado en Docker backend. | Predictor real pendiente |
| CORS | Orígenes permitidos por entorno. | Variables preparadas. | Smoke test pendiente |
| Dominios/HTTPS | Dominio frontend/backend y TLS. | No configurado. | Requerido para producción |
| Puertos | Frontend 3000, backend 3002. | Documentado. | Ajustable por entorno |
| Secretos | `.env` no versionado. | `.env.example` actualizado. | Requiere gestor seguro en producción |

## 14.2 Implementación del Sistema

La implementación debe avanzar por fases controladas.

| Fase | Actividades | Requisito previo | Evidencia esperada | Estado |
|---|---|---|---|---|
| Fase 1: local | Ejecutar backend/frontend, build, typecheck y tests. | Dependencias instaladas. | Logs locales. | Ejecutado parcialmente |
| Fase 2: QA/staging | Configurar DB QA, migraciones, seed QA, HTTP E2E. | `DATABASE_URL_TEST`. | Reporte E2E y checklist. | Pendiente/Bloqueado |
| Fase 3: despliegue controlado | Levantar Docker o plataforma cloud con variables QA. | Docker config y DB QA. | URL staging y smoke tests. | Preparado |
| Fase 4: producción futura | HTTPS, dominio, backups, monitoreo, seguridad ampliada. | QA aprobado con evidencia. | Acta de producción. | No recomendado actualmente |

Docker soporta backend container, frontend container y PostgreSQL local opcional con profile `local-db`. Para QA/staging se recomienda Neon externo en branch/base separada.

## 14.3 Verificación de Funcionamiento

Checklist post-deploy recomendado:

| Verificación | Resultado esperado | Evidencia | Estado |
|---|---|---|---|
| Health backend | API responde sin error 5xx. | Log/curl/captura. | Pendiente |
| Conexión DB | Prisma conecta a DB QA. | Log migración/API. | Pendiente |
| Frontend consume API | Catálogo carga desde backend. | Captura navegador. | Pendiente |
| Login cliente | CUSTOMER inicia sesión solo en `/auth/login`. | Captura/API. | Pendiente |
| Login admin | ADMIN/EMPLOYEE inicia sesión solo en `/admin/login`. | Captura/API. | Pendiente |
| Catálogo | Productos, filtros y búsqueda funcionan. | Captura/API. | Pendiente |
| Imágenes | Uploads y fallback funcionan. | Captura. | Pendiente |
| Carrito | Agrega productos con stock. | Captura. | Pendiente |
| Checkout | Crea orden y snapshot de precio. | API/DB. | Pendiente |
| Pagos manuales | Pendiente/aprobado/rechazado correcto. | Admin/API. | Pendiente |
| Builder | Bloquea incompatibilidades. | Captura/API. | Pendiente |
| Auditoría | Registra eventos críticos. | Admin/API/DB. | Pendiente |
| IA | Error controlado o predicción válida. | Log/API. | Pendiente |
| CORS | Solo orígenes permitidos. | Prueba HTTP. | Pendiente |
| Variables | No hay secretos hardcodeados. | Revisión config. | Pendiente |

## 14.4 Monitoreo del Sistema

El monitoreo productivo aún está pendiente. Para QA/staging se recomienda iniciar con logs centralizados y métricas operativas mínimas.

| Métrica/Evento | Propósito | Herramienta sugerida | Estado |
|---|---|---|---|
| Logs backend | Detectar errores API, auth, pagos, Prisma. | Docker logs, plataforma cloud. | Pendiente |
| Logs frontend | Detectar errores SSR/build/runtime. | Plataforma cloud, navegador. | Pendiente |
| Errores Prisma | Identificar caída DB, P1001, migraciones. | Logs backend, Neon monitoring. | Pendiente |
| Fallos Python | Detectar predictor ausente o dependencias. | Logs backend, auditoría IA futura. | Pendiente |
| Intentos fallidos login | Seguridad operativa. | AuditLog / dashboard admin. | Parcial |
| Auditoría administrativa | Trazabilidad de cambios críticos. | Módulo Historial. | Implementado parcialmente |
| Stock crítico | Evitar quiebres de stock. | Dashboard admin / IA futura. | Pendiente |
| Pagos pendientes | Operación Yape/Plin manual. | Admin pagos. | Implementado parcialmente |
| Errores de imágenes | Detectar upload/fallback roto. | Logs frontend/backend. | Pendiente |
| Disponibilidad | Saber si frontend/backend están caídos. | UptimeRobot o equivalente. | Pendiente |
| Tiempos de respuesta | Detectar degradación. | Plataforma cloud, APM opcional. | Pendiente |
| Predicciones IA | Monitorear alertas y falsos positivos. | Dashboard IA futuro. | Pendiente |
| Errores cliente | Capturar excepciones UI. | Sentry opcional. | Pendiente |
| Uso DB Neon | Conexiones, latencia, límites. | Neon monitoring. | Pendiente |

Antes de producción se requiere definir alertas, responsables, umbrales, backups y procedimiento de respuesta ante incidentes.

## 14.5 Limpieza Controlada de Catálogo previo a QA/Staging

Antes del repaso final y despliegue en nube se preparó una limpieza controlada de catálogo para retirar productos de prueba y volver a registrar productos con especificaciones consistentes.

| Aspecto | Definición | Estado |
|---|---|---|
| Motivo | El catálogo acumuló productos de prueba y cambios sucesivos de specs. | Documentado |
| Migración previa | `CpuSpecs.baseTdpWatts` debe existir en DB para evitar `P2022`. | Preparada; aplicación bloqueada por `P1001` en Neon desde este entorno |
| Comando migración | `npx prisma migrate deploy` o `npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260509120000_add_cpu_base_tdp/migration.sql`. | Pendiente con DB accesible |
| Script limpieza | `npm run clean:products`. | Creado |
| Protección limpieza | Requiere `ALLOW_CLEAN_PRODUCTS=true` y aborta si `NODE_ENV=production`. | Implementado |
| Seed limpio | `npm run seed:products:clean`. | Creado |
| Protección seed | Requiere `ALLOW_SEED_PRODUCTS_CLEAN=true` y aborta si `NODE_ENV=production`. | Implementado |
| Conservado | Usuarios, empleados/admins, branding, banners, órdenes y pagos. | Implementado por diseño |
| Auditoría | Conservada por defecto; limpiar logs de producto solo con `CLEAN_PRODUCT_AUDIT=true`. | Implementado por diseño |

La limpieza no debe ejecutarse sobre producción. Debe realizarse en local o QA/staging con respaldo o base descartable.
