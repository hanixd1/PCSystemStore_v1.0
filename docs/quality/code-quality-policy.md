# Politica de calidad de codigo

## Principio general

Todo desarrollador que modifique un archivo debe dejarlo igual o mejor que antes. Los Code
Smells nuevos del archivo modificado deben resolverse antes de abrir o aprobar un PR.

## Reglas obligatorias

- No se aceptan nuevos issues criticos de seguridad.
- No se aceptan errores de build en frontend ni backend.
- No se aceptan secretos, tokens, passwords reales ni `DATABASE_URL` completas en codigo, logs o docs.
- No se aceptan labels sin `htmlFor` o sin asociacion valida en formularios nuevos.
- No se acepta `Math.random()` para tokens, pagos, codigos de aprobacion, idempotencia o seguridad.
- No se aceptan regex complejas sobre input de usuario sin limite de longitud y sin revision de ReDoS.
- No se aceptan endpoints admin sin autenticacion, guards y validacion de rol.
- El frontend puede contener validaciones UX, pero el backend debe validar reglas criticas de negocio.
- No se debe confiar en precios, stock, permisos, totales, metodos de pago o compatibilidad enviados por el navegador.

## Checklist de PR

- [ ] `npm run build` frontend
- [ ] `npm run build` backend
- [ ] `npm run lint` frontend
- [ ] `npm run lint` backend
- [ ] No se agregaron secretos
- [ ] No se agrego log de credenciales, tokens o URLs completas de base de datos
- [ ] No se agrego logica critica solo en frontend
- [ ] No se agregaron nuevos issues de seguridad SonarQube
- [ ] Las rutas admin nuevas tienen guards y roles
- [ ] Los formularios nuevos tienen labels accesibles
- [ ] Los uploads nuevos tienen limites de tamano, cantidad y tipo MIME

## Manejo de deuda existente

Si un archivo tiene deuda previa, el cambio debe evitar empeorarla. Cuando se trabaje en ese
archivo por una feature o bugfix, se deben resolver los issues nuevos y, si el alcance lo permite,
los issues cercanos de bajo riesgo.
