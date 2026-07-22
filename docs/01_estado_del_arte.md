# Estado del Arte

## 1. Introduccion

El dominio de hardware exige reglas tecnicas que condicionan la compra: socket de procesador y placa madre, tipo de memoria RAM, consumo energetico, dimensiones fisicas, capacidad termica, conectores, formato de gabinete, slots M.2 y disponibilidad real de stock. Por ello, la plataforma combina comercio electronico, configuracion tecnica, gestion administrativa, trazabilidad e inteligencia asistiva.

El objetivo central es reducir decisiones incorrectas del cliente y mejorar la capacidad del administrador para anticipar quiebres de stock. La IA se considera **asistiva**, no autonoma: apoya alertas, recomendaciones y analisis, pero la decision final recae en personal autorizado.

## 2. E-commerce especializado en hardware

Un e-commerce de hardware requiere modelar atributos tecnicos que no son relevantes en tiendas genericas. Entre ellos se incluyen socket, TDP, tipo de RAM, frecuencia, formato, wattage, certificacion, dimensiones fisicas, capacidad de disipacion, puertos, resolucion, panel, latencia y compatibilidad de almacenamiento.

Estos atributos cumplen tres funciones:

| Funcion | Descripcion |
|---|---|
| Comercial | Permiten filtrar, comparar y explicar productos. |
| Tecnica | Alimentan reglas de compatibilidad y configuracion. |
| Operativa | Facilitan inventario, reposicion y auditoria de cambios. |

Cuando estos datos son incompletos o incorrectos, el sistema puede recomendar combinaciones incompatibles, vender productos sin stock o generar informacion comercial poco confiable.

## 3. Validacion de compatibilidad en configuradores de PC

Los configuradores de PC reducen errores de compra al validar combinaciones tecnicas. En PCSystemStore, la compatibilidad debe considerar:

| Regla | Validacion |
|---|---|
| CPU vs motherboard | `CPU.socket === Motherboard.socket`. |
| RAM vs motherboard | Tipo DDR4/DDR5 compatible. |
| Cooler vs CPU | Socket compatible y `cooler.maxTdpWatts >= cpu.tdpWatts`. |
| PSU vs consumo estimado | Fuente suficiente para CPU + GPU + margen base + margen de seguridad. |
| Storage vs motherboard | Slots M.2 disponibles y formatos soportados. |
| Case vs componentes | Formato de placa, largo GPU y altura/radiador del cooler. |

Este tipo de validacion convierte el catalogo en una base de conocimiento tecnica. La calidad de las especificaciones registradas por el administrador es, por tanto, un requisito critico.

## 4. Machine Learning para prediccion de quiebres de stock

La prediccion de quiebres de stock o **stockout prediction** busca anticipar productos con riesgo de agotamiento antes de que ocurra la ruptura de inventario. En comercio electronico, el ML puede aprovechar historicos de ventas, estacionalidad, categorias, rotacion, stock actual, promociones, frecuencia de compra y comportamiento de demanda.

En PCSystemStore, el motor predictivo puede aportar:

| Uso | Beneficio |
|---|---|
| Riesgo de agotamiento | Alertar productos criticos antes de llegar a stock cero. |
| Reposicion asistida | Priorizar compras de componentes de alta rotacion. |
| Alertas comerciales | Activar mensajes basados en datos reales. |
| Planeamiento | Mejorar decisiones de inventario con evidencia historica. |

La prediccion debe operar con controles de calidad: datos suficientes, validacion, monitoreo y explicabilidad basica para administradores.

## 5. IA asistiva en e-commerce

La IA en e-commerce puede asistir en busqueda, recomendacion, soporte, prediccion y priorizacion. Sin embargo, en este proyecto no se debe presentar como mecanismo autonomo de decision. El chatbot y el predictor deben considerarse asistentes que entregan sugerencias, explicaciones o alertas; la aprobacion de compras, pagos, inventario y reposicion corresponde al administrador.

Esta separacion reduce riesgos operativos, evita decisiones automaticas no supervisadas y se alinea parcialmente con buenas practicas de gobernanza de IA.

## 6. Scarcity messages y FOMO basado en datos reales

Los mensajes de escasez y urgencia pueden mejorar conversion, pero tambien pueden volverse manipulativos si no se basan en datos reales. En PCSystemStore, los mensajes tipo "ultimas unidades" o "alta demanda" deben activarse solo cuando exista evidencia:

| Fuente de evidencia | Uso permitido |
|---|---|
| Stock real bajo | Mensaje de baja disponibilidad. |
| Prediccion de riesgo alto | Alerta de posible quiebre. |
| Ventas recientes | Indicador de rotacion o demanda. |
| Promocion activa | Etiqueta de oferta configurada por admin. |

No se recomienda generar FOMO artificial sin relacion con inventario o demanda real.

## 7. CRISP-ML(Q) y aseguramiento de calidad en ML

CRISP-ML(Q) extiende el enfoque CRISP-DM hacia proyectos de Machine Learning con criterios de calidad. Sus fases pueden relacionarse con PCSystemStore de la siguiente forma:

| Fase CRISP-ML(Q) | Aplicacion en PCSystemStore |
|---|---|
| Business and Data Understanding | Definir quiebre de stock, demanda, ventas, categorias y costos operativos. |
| Data Preparation | Limpiar historicos, normalizar productos, manejar faltantes y periodos sin ventas. |
| Modeling | Entrenar modelos de riesgo de stockout o demanda. |
| Evaluation | Medir precision, recall, falsos positivos y utilidad para reposicion. |
| Deployment | Integrar resultados como alertas asistivas en admin. |
| Monitoring and Maintenance | Vigilar deriva de datos, caida de precision y cambios de catalogo. |

El proyecto debe evitar desplegar predicciones sin monitoreo ni evidencia de evaluacion.

## 8. Normas y modelos de calidad aplicables

| Norma/modelo | Aplicacion al proyecto | Estado |
|---|---|---|
| ISO 9001 | Gestion de procesos, control documental, mejora continua. | Alineacion conceptual; no certificacion. |
| ISO/IEC 25010 | Calidad del producto software: funcionalidad, seguridad, mantenibilidad, usabilidad, rendimiento, compatibilidad, fiabilidad y portabilidad. | Criterios basados en la norma. |
| ISO/IEC 27001 | Seguridad de informacion: control de accesos, credenciales, trazabilidad y proteccion de datos. | Aplicacion parcial. |
| ISO/IEC 42001 | Gobernanza de sistemas de IA. | Alineacion conceptual para IA asistiva. |
| IEEE 730 | Aseguramiento de calidad de software. | Base para plan de pruebas y evidencias. |
| IEEE 1074 | Procesos de ciclo de vida de software. | Base para planificacion y fases. |

## 9. Brecha identificada

La brecha que cubre PCSystemStore se resume en cuatro puntos:

| Problema en sistemas genericos | Respuesta de PCSystemStore |
|---|---|
| E-commerce comun no valida compatibilidad tecnica. | Configurador con reglas de hardware. |
| Inventario manual no anticipa quiebres. | Motor predictivo asistivo de riesgo de stockout. |
| FOMO suele ser comercial y no basado en datos. | Alertas condicionadas a stock real o prediccion. |
| Gestion administrativa sin trazabilidad fina. | Auditoria de productos, stock, pagos, editores y banners. |

## 10. Conclusion del estado del arte

PCSystemStore se ubica en la interseccion entre e-commerce especializado, gestion inteligente de inventario, configuracion tecnica y administracion trazable. Su valor diferencial no depende solo de vender productos, sino de integrar reglas tecnicas, datos de stock, auditoria e IA asistiva para reducir errores comerciales y anticipar quiebres. La calidad del sistema depende de mantener especificaciones tecnicas consistentes, validaciones backend confiables, pruebas de compatibilidad y evidencia de desempeno del motor predictivo.

## 11. Referencias

Las referencias se registran en formato IEEE. Algunos datos bibliograficos deben completarse con la biblioteca o fuente academica final antes de sustentacion.

[1] ISO/IEC, "ISO/IEC 25010 Systems and software Quality Requirements and Evaluation (SQuaRE) - Product quality model," International Organization for Standardization, 2011.

[2] ISO, "ISO 9001 Quality management systems - Requirements," International Organization for Standardization, 2015.

[3] ISO/IEC, "ISO/IEC 27001 Information security management systems - Requirements," International Organization for Standardization, 2022.

[4] ISO/IEC, "ISO/IEC 42001 Artificial intelligence management system," International Organization for Standardization, 2023.

[5] IEEE, "IEEE Standard for Software Quality Assurance Processes," IEEE Std 730, IEEE Computer Society.

[6] IEEE, "IEEE Standard for Developing Software Life Cycle Processes," IEEE Std 1074, IEEE Computer Society.

[7] S. Studer et al., "Towards CRISP-ML(Q): A Machine Learning Process Model with Quality Assurance Methodology," Machine Learning and Knowledge Extraction, 2021. Datos editoriales finales: pendiente de completar.

[8] F. Ricci, L. Rokach, and B. Shapira, Recommender Systems Handbook. Springer. Edicion y datos finales: pendiente de completar.

[9] Literatura sobre stockout prediction, inventory forecasting y demand forecasting en retail/e-commerce. Referencias academicas especificas: pendiente de completar.
