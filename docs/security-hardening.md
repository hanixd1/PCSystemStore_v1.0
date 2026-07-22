# Endurecimiento de seguridad

## Riesgos corregidos

Antes de esta revisión, el throttling general y la recuperación de contraseña usaban un `Map` por proceso. Esto se perdía al reiniciar Railway y no se compartía entre réplicas. El login de cliente solo tenía un límite por IP, no una política persistente por cuenta. El `package-lock.json` antiguo describía un árbol distinto al de pnpm y la CSP permitía scripts inline en producción.

## Login de cliente

`SecurityRateLimitStorage` es el único almacenamiento de rate limits de Nest y usa PostgreSQL/Prisma. La tabla `SecurityRateLimit` contiene contadores efímeros; sus claves son HMAC-SHA-256 de correo normalizado o IP, nunca valores crudos.

| Control | Política |
| --- | --- |
| Cuenta | 4 fallos consecutivos dentro de 60 min; el cuarto bloquea 1 hora. |
| Escalamiento | Al expirar ese bloqueo hay 2 intentos más; el segundo fallo bloquea 24 horas. Tras expirar ese segundo bloqueo, la cuenta vuelve a la fase inicial. |
| IP | 20 fallos de login de cliente por hora bloquean el origen durante una hora, para reducir password spraying. |
| Éxito | Elimina el estado de la cuenta, pero no el agregado por IP para no borrar las señales de otros usuarios. |
| Respuesta | Credenciales inválidas o 429 genérico con `Retry-After`; no revela cuenta, contador, clave ni hash. |

Las mutaciones son `INSERT ... ON CONFLICT ... UPDATE ... RETURNING` y el bloqueo de fila de PostgreSQL serializa solicitudes concurrentes. Por ello las réplicas Railway y los reinicios comparten el estado. No se añadió Redis; el adaptador sigue desacoplado tras la interfaz `ThrottlerStorage`, por lo que puede sustituirse después por Redis.

El login ADMIN/EDITOR conserva su tabla de estado existente en `User` y su `UPDATE ... RETURNING` atómico. No se reutilizó ni debilitó esa política. Las solicitudes de recuperación mantienen el mismo texto para cuentas existentes e inexistentes; combinan el límite persistente por cuenta con el throttler persistente por IP, y no desbloquean por sí mismas el límite de cliente.

## Throttling y proxies

El guard global (100/min por IP) y los límites específicos de login, registro, recuperación, reset, Google OAuth, chatbot, búsqueda e importación de productos usan el mismo storage PostgreSQL. Las claves de cuenta e IP se normalizan/HMAC; los registros vencidos se pueden eliminar con `SecurityRateLimitStorage.pruneExpired()` y tienen índices por expiración y bloqueo.

`TRUST_PROXY=1` es la configuración prevista para un único proxy Railway. No se lee `X-Forwarded-For` directamente: Express determina `request.ip` después de esa configuración. No se debe cambiar a un valor que confíe en clientes directos; para otra topología configure solo el número de saltos o una subred segura.

## CORS, cookies, CSRF y auditoría

`CORS_ORIGINS` y `CSRF_ALLOWED_ORIGINS` se validan como orígenes HTTP(S), se normalizan y fallan al arrancar en producción si quedan vacíos. No hay wildcard con credenciales. Las preflight autorizadas permiten solo cabeceras necesarias. Las cookies siguen siendo HttpOnly, Secure en producción y con double-submit CSRF + comprobación de Origin/Referer para mutaciones con cookies.

Eventos registrados sin secretos: `CUSTOMER_LOGIN_SUCCESS`, `CUSTOMER_LOGIN_FAILED`, `CUSTOMER_LOGIN_BLOCKED`, `CUSTOMER_LOGIN_BLOCKED_ATTEMPT`, los eventos administrativos existentes, `PASSWORD_RESET_REQUESTED` y `PASSWORD_RESET_LIMITED`. Un fallo al auditar se registra de forma controlada y no interrumpe autenticación. Las IP solo se conservan en los campos de auditoría existentes y las claves de rate limit usan HMAC; defina una retención operativa para `ActionLog` conforme a la política de privacidad.

## Cabeceras y CSP

El backend mantiene Helmet global: `nosniff`, anti-framing, `Referrer-Policy: no-referrer`, COOP, CSP mínima para JSON y HSTS solo para producción HTTPS después del proxy confiable. No se aplica una CSP de interfaz a endpoints JSON.

Next entrega `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Permissions-Policy`, COOP, HSTS de producción y elimina `X-Powered-By`. `frontend/proxy.ts` genera un nonce por respuesta y envía esta CSP obligatoria en producción:

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
form-action 'self'; script-src 'self' 'nonce-<aleatorio>'; style-src 'self' 'unsafe-inline';
font-src 'self' data:; img-src 'self' data: blob: [Cloudinary configurado];
connect-src 'self' [NEXT_PUBLIC_API_URL]; frame-src 'self' [Google Maps configurado];
worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
```

`unsafe-inline` se eliminó de `script-src` en producción; no se permite `unsafe-eval`. Se conserva en `style-src` porque Next/React emite estilos inline. En desarrollo el proxy permite inline/eval solo para herramientas de desarrollo. Cloudinary se agrega exclusivamente como `https://res.cloudinary.com/<NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME>` y Google Maps solo cuando sus variables están configuradas; no hay comodines `https:` o `*`.

El nonce hace dinámicas las rutas HTML (reduce la posibilidad de caché estática de esas respuestas). Es el coste elegido para una CSP ejecutable y estricta. Los assets estáticos quedan fuera del proxy; siguen recibiendo las demás cabeceras de `next.config.ts` y no requieren CSP de documento.

## Gestor de paquetes y dependencias

El gestor oficial del frontend es `pnpm@9.15.9`, fijado en `packageManager`; `pnpm-lock.yaml` es el único lockfile y `pnpm-workspace.yaml` declara explícitamente el paquete raíz. Se eliminó `frontend/package-lock.json` para evitar que npm reconstruya un árbol distinto.

| Paquete | Estado base del repositorio | Estado actual | Motivo |
| --- | --- | --- | --- |
| next / eslint-config-next | 16.1.6 | 16.2.10 | Parche de seguridad compatible de Next 16. |
| react / react-dom | 19.2.3 | 19.2.7 | Parche compatible con Next 16. |
| axios | 1.13.4 | 1.18.1 | Actualización parcheada. |
| form-data (transitiva de axios) | 4.0.5 | 4.0.6 | Override pnpm dirigido, compatible con el rango de axios. |
| postcss directo/transitivo de herramientas | 8.5.6 | 8.5.19 | Parche para tooling y Tailwind. |

`pnpm audit --prod` todavía informa `postcss@8.4.31` incluido de forma exacta por `next@16.2.10`. El registro npm confirma que esa es también la dependencia de `next@latest` al momento de la revisión, por lo que un override no la sustituye de forma efectiva. No se declara resuelto: el riesgo residual es una XSS al serializar CSS no confiable dentro de Next; el proyecto no acepta CSS arbitrario de usuarios. Vigilar una próxima versión de Next que actualice su dependencia y volver a ejecutar la auditoría.

## Migración y mantenimiento

La migración nueva es `20260717110000_add_distributed_security_rate_limits`; crea `SecurityRateLimit` e índices de expiración/bloqueo. No se aplicó ninguna migración remota.

```bash
# Local, con una base de desarrollo aislada
cd backend
npm run prisma:generate
npm run prisma:migrate

# Railway, después de revisar DATABASE_URL/DIRECT_URL y desplegar el artefacto
npm run prisma:deploy
```

Configure también `RATE_LIMIT_KEY_SECRET` (secreto aleatorio y estable), los valores `CUSTOMER_LOGIN_*`, `CORS_ORIGINS`, `CSRF_ALLOWED_ORIGINS` y `TRUST_PROXY`. El rollback local consiste en restaurar el código/lockfile anterior y ejecutar una migración Prisma explícita que elimine solo `SecurityRateLimit` si ya no se necesita; nunca use `db push` como rollback de producción.

## Validación reproducible

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:validate
npm test -- --runInBand
npm run lint:check
npm run build
npm audit --omit=dev

cd ../frontend
pnpm install --frozen-lockfile
pnpm why next && pnpm why axios && pnpm why form-data
pnpm audit --prod
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm exec next start -p 3200
curl -I http://127.0.0.1:3200/
curl -I http://127.0.0.1:3200/auth/login
curl -I http://127.0.0.1:3200/admin/login
```

Después del despliegue, el propietario debe repetir las tres consultas contra el dominio Vercel público, comprobar en DevTools que la CSP no bloquea recursos legítimos y revisar los logs Railway para 429/errores de migración. Vercel y Railway no se modificaron durante este trabajo.
