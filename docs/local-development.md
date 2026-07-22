# Desarrollo local en macOS

PCSystemStore usa dos procesos independientes. El puerto `3000` corresponde al frontend Next.js y el puerto `3001` al backend NestJS.

Antes de iniciar, copia los archivos de ejemplo si todavía no tienes configuración local y completa únicamente las variables necesarias. Para el frontend, `NEXT_PUBLIC_API_URL` debe ser `http://localhost:3001`. Para el backend, los orígenes locales de CORS deben incluir `http://localhost:3000`.

## Terminal 1: frontend

```bash
cd /Users/taki/Documents/proyectos/pagina/pc-system-store/frontend
pnpm dev
```

Resultado esperado: <http://localhost:3000>

El script ejecuta Next.js. No pases `--port 3001`: `pnpm dev --port 3001` desde `frontend/` intenta iniciar otro servidor Next.js y no inicia NestJS.

## Terminal 2: backend

```bash
cd /Users/taki/Documents/proyectos/pagina/pc-system-store/backend
npm run start:dev
```

Resultado esperado: <http://localhost:3001>

NestJS obtiene el puerto de `PORT`. Si la variable no existe usa `3001`; un valor válido lo reemplaza y un valor inválido detiene el arranque con un error claro. Railway puede inyectar su propio `PORT` y el backend lo respeta.

## Desde la raíz

Desde `/Users/taki/Documents/proyectos/pagina/pc-system-store`:

```bash
pnpm dev:frontend
pnpm dev:backend
```

Ejecuta cada comando en una terminal distinta. `dev:frontend` usa pnpm y `dev:backend` delega expresamente a `npm --prefix backend run start:dev`, conservando el flujo usado por Railway. Los nombres explícitos evitan depender de la carpeta actual. No se añadió un `pnpm dev` conjunto ni dependencias adicionales.

## Comandos de comprobación

```bash
curl -I http://localhost:3000
curl http://localhost:3001/health
```

## Solución de conflictos

Comprueba qué proceso escucha antes de detener o limpiar nada:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
ps -p <PID> -o pid,ppid,command=
```

Si el PID corresponde a un servidor legítimo, déjalo activo. Frontend y backend son procesos independientes: nunca es necesario detener Next.js para iniciar NestJS. Si confirmas que un proceso ya no debe seguir activo, usa primero `kill <PID>`; evita `kill -9`, `pkill node` y `killall node` como solución normal.

El archivo `frontend/.next/dev/lock` es normal mientras Next.js está activo. No borres `.next` ni el lock si existe un proceso Next legítimo. Solo considera retirar un lock puntual cuando no exista ningún proceso Next activo y haya evidencia de que el lock quedó obsoleto.
