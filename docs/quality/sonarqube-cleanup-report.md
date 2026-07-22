# Reporte de limpieza SonarQube

Fecha: 2026-05-20

## Objetivo

Configurar reglas de ESLint y Prettier para frontend y backend, ejecutar autofix controlado y
dejar scripts de calidad para reducir issues menores de mantenibilidad sin cambiar logica de
negocio.

## Configuracion aplicada

Frontend:

- ESLint flat config en `frontend/eslint.config.mjs`.
- Prettier en `frontend/.prettierrc`.
- Ignore de Prettier en `frontend/.prettierignore`.
- Scripts `lint`, `lint:fix`, `format`, `format:check` y `quality` en `frontend/package.json`.

Backend:

- ESLint flat config en `backend/eslint.config.mjs`.
- Prettier en `backend/.prettierrc`.
- Ignore de Prettier en `backend/.prettierignore`.
- Scripts `lint`, `lint:fix`, `format`, `format:check` y `quality` en `backend/package.json`.

## Comandos ejecutados

Frontend:

```bash
npm run lint:fix
npm run format
npm run lint
npm run build
```

Resultado:

- `lint:fix`: correcto, con warnings pendientes.
- `format`: correcto.
- `lint`: correcto, 0 errores y 76 warnings.
- `build`: correcto.

Backend:

```bash
npm run lint:fix
npm run format
npm run build
```

Resultado:

- `lint:fix`: correcto, 0 errores y 1305 warnings.
- `format`: correcto.
- `build`: correcto.

## Archivos modificados por configuracion

- `frontend/eslint.config.mjs`
- `frontend/.prettierrc`
- `frontend/.prettierignore`
- `frontend/package.json`
- `backend/eslint.config.mjs`
- `backend/.prettierrc`
- `backend/.prettierignore`
- `backend/package.json`

## Issues corregidos automaticamente

- Formato consistente con Prettier en archivos TypeScript, TSX y configuraciones.
- Imports, JSX y spacing corregidos por autofix cuando ESLint pudo hacerlo de forma segura.
- Labels accesibles y JSX de formularios ya corregidos previamente fueron preservados por lint.
- Se dejaron reglas de seguridad/mantenibilidad como warnings cuando requieren refactor manual y podrian tocar logica critica.

## Issues que requieren revision manual

- Frontend conserva warnings de `@typescript-eslint/no-explicit-any`, `no-console`, `<img>` frente a `next/image` y reglas de React Compiler en rutas de catalogo.
- Backend conserva warnings de `any`, accesos inseguros tipados por `any`, `console`, `no-case-declarations`, `no-base-to-string` y algunos helpers de tests.
- Los warnings de `no-case-declarations`, `no-base-to-string` y `only-throw-error` se dejaron como deuda controlada para evitar refactors amplios en pagos, productos, IA o builder durante un autofix.
- Cambios que afecten pagos, stock, checkout, auth, roles, Prisma o IA deben revisarse de forma manual antes de aplicar refactors funcionales.

## Riesgos encontrados

- El formateo impacta muchos archivos. La mayor parte son cambios mecanicos de estilo, pero debe revisarse el diff antes de merge.
- El sandbox local produjo `EPERM` al leer binarios dentro de `node_modules`; los comandos afectados se reejecutaron con permisos aprobados.
- El primer intento de `format` frontend fallo por un patron `hooks/**/*` inexistente; el script se ajusto a carpetas reales del proyecto.

## Recomendaciones antes de despliegue cloud

- Ejecutar `npm run quality` en frontend y backend antes de cada release.
- Revisar en SonarQube que no existan Security Hotspots sin marcar como revisados.
- No aceptar nuevos issues criticos o bloqueantes.
- Reducir progresivamente warnings de `any` en archivos que se toquen por features.
- Mantener validaciones criticas en backend aunque exista validacion UX en frontend.
