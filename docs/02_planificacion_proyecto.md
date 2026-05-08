# Planificacion del Proyecto

## 1. Introduccion

Este documento define la planificacion tecnica de PCSystemStore, considerando alcance, objetivos, entregables, fases, responsabilidades y riesgos. La planificacion esta orientada a estabilizar el sistema, preparar pruebas, documentar evidencia y habilitar despliegue QA/staging.

## 2. Objetivo general

Automatizar y mejorar la gestion comercial e inventario de PCSystemStore mediante un e-commerce especializado en hardware, configurador de compatibilidad, gestion administrativa, auditoria y motor predictivo de IA asistiva para anticipar quiebres de stock.

## 3. Objetivos especificos

| ID | Objetivo especifico | Indicador sugerido |
|---|---|---|
| OE-01 | Reducir errores de compatibilidad entre componentes. | Casos incompatibles bloqueados por builder. |
| OE-02 | Evitar venta de productos sin stock. | Stock nunca negativo en pruebas de checkout. |
| OE-03 | Centralizar datos de productos y especificaciones tecnicas. | Producto con specs completas por categoria. |
| OE-04 | Mejorar auditoria administrativa. | Registro de cambios de stock, precio, imagen, empleado y pago. |
| OE-05 | Habilitar carga dinamica de banners y logo. | Home y header consumen configuracion administrable. |
| OE-06 | Gestionar pagos simulados/manuales sin pasarela real. | Pago manual descuenta stock solo al aprobar. |
| OE-07 | Integrar IA predictiva asistiva. | Alerta de riesgo con evidencia de datos. |
| OE-08 | Crear base de pruebas tecnicas. | Matriz de pruebas y evidencias por modulo. |

## 4. Alcance

### IN SCOPE

| Modulo | Alcance |
|---|---|
| Catalogo | Busqueda, categorias, detalle, productos relacionados y ofertas. |
| Productos | CRUD, especificaciones tecnicas, imagenes, stock y precio. |
| Builder | Validacion de compatibilidad de componentes. |
| Carrito/checkout | Carrito, autenticacion cliente, ordenes y stock. |
| Pagos | Simulados para tarjeta y manuales Yape/Plin en revision. |
| Usuarios | Cliente, admin, empleado, login separado y rutas protegidas. |
| Auditoria | Seguridad/admin, productos, inventario, pagos y branding. |
| Branding/banners | Logo y banners dinamicos administrables. |
| Chatbot | Asistencia IA al usuario/cliente. |
| IA predictiva | Motor asistivo para riesgo de quiebre de stock. |

### OUT OF SCOPE

| Elemento | Motivo |
|---|---|
| Pasarela bancaria real | El proyecto usa pagos simulados/manuales por ahora. |
| Facturacion SUNAT | Requiere integracion tributaria fuera del alcance actual. |
| Tracking GPS | No corresponde al flujo base. |
| Compra automatica a proveedores | La IA es asistiva, no autonoma. |
| Certificacion ISO formal | Solo se aplican criterios o alineacion parcial. |

## 5. Supuestos

| Supuesto | Implicancia |
|---|---|
| El administrador registra specs correctas. | La compatibilidad depende de calidad de datos. |
| El dataset de ventas crecera. | La IA mejorara con historicos reales. |
| La IA es asistiva. | No ejecuta compras ni modifica stock autonomamente. |
| El sistema puede desplegarse primero en QA/cloud gratuito. | Se requiere validar CORS, env y DB. |

## 6. Restricciones

| Restriccion | Descripcion |
|---|---|
| Arquitectura | Monolitica modular con frontend/backend separados. |
| Stack | Next.js, React, Tailwind, Zustand, NestJS, Prisma, PostgreSQL/Neon y Python. |
| Pagos | Sin pasarela real; solo simulados/manuales. |
| IA | Local o integrada mediante Python; pendiente de evidencia formal. |
| Configuracion | Variables de entorno obligatorias para API, CORS, DB y JWT. |
| Seguridad | Rutas admin y cliente separadas por rol. |

## 7. Entregables

| ID | Entregable | Descripcion | Estado |
|---|---|---|---|
| E-01 | Documentacion tecnica | Carpeta `docs` con documentos de revision. | Generado |
| E-02 | Estado del arte | Marco teorico y brecha tecnica. | Generado |
| E-03 | Matriz de pruebas | Casos por modulo y prioridad. | Generado; pendiente de ejecucion |
| E-04 | Pruebas SQLi | Validacion de inyeccion SQL en auth/busqueda/API. | Pendiente de validacion |
| E-05 | Pruebas E2E | Flujo cliente/admin completo. | Pendiente de validacion |
| E-06 | Pruebas de compatibilidad | Builder con reglas CPU/RAM/PSU/cooler/storage. | Pendiente de validacion |
| E-07 | Revision de codigo | Auditoria de archivos, responsabilidades y deuda. | Generado |
| E-08 | Reporte de deuda tecnica | Plan de refactorizacion. | Generado |
| E-09 | Evidencia despliegue QA | URL, logs y smoke tests. | Pendiente de validacion |

## 8. Cronograma sugerido

| Fase | Actividades | Duracion estimada | Responsable | Evidencia |
|---|---|---:|---|---|
| Fase 1 | Estabilizacion funcional, builds, env, CORS, auth, stock y ofertas. | 1-2 semanas | Desarrollador | Build logs, smoke test |
| Fase 2 | Pruebas de seguridad: SQLi, XSS, rutas admin, JWT y CORS. | 1 semana | QA | Reporte Postman/Insomnia |
| Fase 3 | Pruebas de compatibilidad builder. | 1 semana | QA + Desarrollador | Matriz builder ejecutada |
| Fase 4 | Integracion IA y validacion de dataset. | 1-2 semanas | Desarrollador IA | Reporte pytest/modelo |
| Fase 5 | Despliegue QA/staging. | 1 semana | DevOps | URL staging, logs |
| Fase 6 | Documentacion final y evidencias. | 1 semana | Tech Lead + QA | Carpeta evidencias |

## 9. Matriz RACI

| Actividad | Responsable | Aprobador | Consultado | Informado |
|---|---|---|---|---|
| Desarrollo frontend/backend | Desarrollador | Tech Lead | QA | Administrador |
| Pruebas funcionales | QA | Tech Lead | Desarrollador | Docente/Revisor |
| Revision de seguridad | QA | Tech Lead | Desarrollador | Administrador |
| Validacion IA | Desarrollador IA | Tech Lead | QA | Docente/Revisor |
| Aprobacion de despliegue QA | Tech Lead | Administrador | QA | Usuario final |
| Documentacion final | Tech Lead | Docente/Revisor | QA | Administrador |

## 10. Riesgos de planificacion

| Riesgo | Impacto | Probabilidad | Mitigacion |
|---|---|---|---|
| Falta de datos para IA | Alta | Alta | Usar dataset inicial, registrar ventas reales y marcar IA como asistiva. |
| Specs incorrectas | Alta | Media | Validaciones backend, auditoria y revision admin. |
| Bugs en checkout | Alta | Media | Pruebas E2E, transacciones y control de stock. |
| Fallos de imagenes | Media | Media | Fallback visual y validacion de uploads. |
| Permisos admin/cliente mezclados | Alta | Media | Login separado, JWT con rol y pruebas de autorizacion. |
| Codigo duplicado | Media | Alta | Refactor planificado de formularios y servicios. |
| Falta de pruebas automatizadas | Alta | Alta | Priorizar pruebas criticas antes de staging. |
| CORS/env mal configurados | Alta | Media | `.env.example`, health check y smoke test por entorno. |
