# Indice de Documentacion Tecnica - PCSystemStore

## Proyecto

**Sistema Inteligente de Prediccion de Quiebres de Stock y Asistencia Comercial Dinamica mediante Machine Learning para Comercio Electronico de Hardware en la empresa PCSystemStore, Huancayo**.

PCSystemStore es una plataforma web de comercio electronico especializada en hardware. Integra catalogo de productos, especificaciones tecnicas, configurador inteligente de PC, validacion de compatibilidad, carrito, checkout con pagos simulados/manuales, gestion administrativa, auditoria, banners y marca dinamica, gestion de clientes/pedidos/direcciones, chatbot/asistente IA y motor predictivo asistivo para riesgo de quiebre de stock.

## Proposito de la documentacion

Esta carpeta consolida documentos de soporte tecnico, academico y de calidad para revision de tesis, sustentacion, QA, estabilizacion y despliegue controlado. La documentacion no constituye certificacion ISO; solo registra criterios basados en normas y modelos reconocidos, con evidencia pendiente donde aun no existen pruebas ejecutadas.

## Documentos incluidos

| Documento | Proposito | Estado |
|---|---|---|
| 01_estado_del_arte.md | Fundamentar tecnicamente el proyecto frente a e-commerce especializado, compatibilidad de hardware, ML para stockout e IA asistiva. | Generado; referencias pendientes de completar en fuentes academicas finales |
| 02_planificacion_proyecto.md | Definir objetivos, alcance, supuestos, restricciones, entregables, cronograma, RACI y riesgos. | Generado |
| 03_plan_de_pruebas.md | Establecer estrategia de pruebas funcionales, API, E2E, seguridad, IA, rendimiento y auditoria. | Generado; ejecucion pendiente |
| 04_matriz_pruebas.md | Listar casos de prueba trazables por modulo, prioridad y estado. | Generado; estado inicial Pendiente de ejecucion |
| 05_trazabilidad_requisitos_pruebas.md | Conectar requisitos funcionales/reglas de negocio con pruebas, normas y evidencia esperada. | Generado; evidencia pendiente |
| 06_auditoria_codigo.md | Registrar revision tecnica del codigo fuente, hallazgos, deuda, duplicacion y riesgos. | Generado con evidencia de inspeccion local |
| 07_deuda_tecnica_refactorizacion.md | Proponer plan controlado de refactorizacion por prioridad y fases. | Generado |
| 08_reporte_final_revision_tecnica.md | Consolidar estado tecnico, riesgos, checklist y recomendacion de Tech Lead. | Generado |
| 09_dockerizacion_despliegue.md | Documentar Dockerfiles, Docker Compose, Neon externo/PostgreSQL local opcional y variables de despliegue. | Generado; build/up pendiente |
| 10_estrategia_pruebas_software.md | Definir la estrategia de pruebas incremental, basada en riesgos y alineada con ISO/IEC 25010. | Generado; evidencia parcial |
| 11_automatizacion_pruebas.md | Documentar herramientas, scripts, entorno test/QA, DATABASE_URL_TEST y pipeline sugerido. | Generado; HTTP E2E bloqueado por DB QA |
| 12_metricas_calidad.md | Registrar metricas actuales, defectos, criterios ISO/IEC 25010 y evaluacion por estandares. | Generado; metricas en actualizacion continua |
| 13_implementacion_monitoreo.md | Definir preparacion de entorno, fases de implementacion, verificacion post-deploy y monitoreo recomendado. | Generado; monitoreo productivo pendiente |

## Recomendaciones de uso

| Uso | Recomendacion |
|---|---|
| Sustentacion academica | Usar `01_estado_del_arte.md`, `02_planificacion_proyecto.md` y `05_trazabilidad_requisitos_pruebas.md` como base teorica y metodologica. |
| Revision tecnica | Usar `06_auditoria_codigo.md`, `07_deuda_tecnica_refactorizacion.md` y `08_reporte_final_revision_tecnica.md`. |
| QA funcional | Usar `03_plan_de_pruebas.md`, `04_matriz_pruebas.md`, `10_estrategia_pruebas_software.md` y `11_automatizacion_pruebas.md` como base de ejecucion. |
| Despliegue QA/staging | Usar `09_dockerizacion_despliegue.md`, `13_implementacion_monitoreo.md` y `docs/qa_staging_checklist.md`. |
| Metricas y calidad | Usar `12_metricas_calidad.md` para registrar evidencia, defectos y alineacion con ISO/IEC 25010. |
| Evidencias | Adjuntar capturas, logs, reportes Playwright, Postman, Jest, pytest y resultados de build en una carpeta futura `docs/evidencias`. |

## Estado general

La documentacion queda generada para iniciar QA/staging. Las pruebas descritas no deben considerarse ejecutadas hasta adjuntar evidencias reales. Los puntos marcados como **Pendiente de validacion** requieren ejecucion formal antes de despliegue productivo.
