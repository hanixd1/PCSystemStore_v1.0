# Matriz de Pruebas - PCSystemStore

> Estado inicial: todos los casos quedan en **Pendiente de ejecucion** hasta adjuntar evidencia real.

| ID | Modulo | Requisito asociado | Caso de prueba | Precondicion | Datos de entrada | Pasos | Resultado esperado | Tipo | Prioridad | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Autenticacion | RF-01 | Login cliente valido | Cliente registrado | hanny@test.com / clave valida | Ingresar en `/auth/login` | Token cliente y header con nombre | E2E/API | Alta | Pendiente de ejecucion |
| AUTH-02 | Autenticacion | RF-01 | Login cliente invalido | Usuario existe | Password erroneo | Enviar login | Error controlado sin token | API | Alta | Pendiente de ejecucion |
| AUTH-03 | Autenticacion | RF-01 | Login admin valido | Admin registrado | Credenciales admin | Ingresar en `/admin/login` | Acceso admin | E2E/API | Alta | Pendiente de ejecucion |
| AUTH-04 | Autorizacion | RF-01 | Admin no entra como cliente si no existe cuenta cliente | Admin registrado | Credenciales admin | Login en `/auth/login` | Rechazo por rol | API | Alta | Pendiente de ejecucion |
| AUTH-05 | Autorizacion | RF-01 | Cliente no entra como admin | Cliente registrado | Credenciales cliente | Login en `/admin/login` | 403 permisos admin | API | Alta | Pendiente de ejecucion |
| AUTH-06 | Autorizacion | RF-01 | Ruta admin sin token | Sin sesion | GET admin | Abrir endpoint admin | 401 | API | Critica | Pendiente de ejecucion |
| AUTH-07 | Autorizacion | RF-01 | Ruta admin con rol cliente | Cliente logueado | Token CUSTOMER | Acceder admin | 403 | API | Critica | Pendiente de ejecucion |
| AUTH-08 | Autorizacion | RF-01 | Token expirado | Token vencido | Bearer expirado | Consumir endpoint protegido | 401 controlado | API | Alta | Pendiente de ejecucion |
| AUTH-09 | Autorizacion | RF-01 | Separacion `/auth/login` y `/admin/login` | Usuarios por rol | Credenciales validas | Probar ambas rutas | No hay redireccion cruzada | E2E | Alta | Pendiente de ejecucion |
| PROD-01 | Productos | RF-02 | Crear producto valido | Admin autenticado | Producto completo | Crear en admin | Producto visible en catalogo | E2E/API | Alta | Pendiente de ejecucion |
| PROD-02 | Productos | RF-02 | Crear producto sin nombre | Admin autenticado | Nombre vacio | Enviar formulario | Error de validacion | UI/API | Media | Pendiente de ejecucion |
| PROD-03 | Productos | RF-02 | Crear producto con precio 0 | Admin autenticado | price=0 | Guardar | Rechazo | UI/API | Alta | Pendiente de ejecucion |
| PROD-04 | Productos | RF-02 | Crear producto con stock negativo | Admin autenticado | stock=-1 | Guardar | Rechazo | UI/API | Alta | Pendiente de ejecucion |
| PROD-05 | Productos | RF-02 | Editar stock | Producto existente | stock=10 | Guardar | Stock actualizado y auditado | E2E/API | Alta | Pendiente de ejecucion |
| PROD-06 | Productos | RF-02 | Editar precio | Producto existente | price=1000 | Guardar | Precio 1000.00 sin ajuste | E2E/API | Alta | Pendiente de ejecucion |
| PROD-07 | Productos | RF-12 | Editar imagenes | Producto existente | 1-5 imagenes | Guardar | Imagenes actualizadas | E2E/API | Media | Pendiente de ejecucion |
| PROD-08 | Auditoria | RF-14 | Auditoria de cambios | AuditLog disponible | Cambio precio/stock | Revisar historial | Evento registrado | API/UI | Alta | Pendiente de ejecucion |
| PROD-09 | Productos | RF-02 | CPU registra TDP base y TDP maximo | Admin autenticado | baseTdpWatts=65, tdp=105 | Crear/editar CPU | `baseTdpWatts` se guarda como dato informativo y `tdp` permanece para builder | UI/API | Alta | Pendiente de ejecucion |
| PROD-10 | Productos | RF-02 | Motherboard registra marca tecnica | Admin autenticado | brand=ASUS/MSI/Gigabyte/ASRock/Otros | Crear/editar placa madre | Marca requerida, guardada en specs y visible en detalle publico si existe | UI/API | Alta | Pendiente de ejecucion |
| PROD-11 | Productos | RF-02 | GPU registra marca, VRAM select y PSU recomendada | Admin autenticado | brand=Gigabyte, vram=32, gpuPowerWatts=450, recommendedPsuWatts=850 | Crear/editar GPU | Marca requerida, VRAM normalizada, consumo real guardado y PSU recomendada opcional/positiva | UI/API | Alta | Pendiente de ejecucion |
| CAT-01 | Catalogo | RF-03 | Filtrar CPU por marca AMD | Productos CPU cargados | `category=CPU&cpuBrand=AMD` | Aplicar filtro en catalogo/API | Solo procesadores AMD | API/UI | Alta | Pendiente de ejecucion |
| CAT-02 | Catalogo | RF-03 | Filtrar CPU por socket AM5 | Productos CPU AM4/AM5 | `socket=AM5` | Aplicar filtro | Solo CPU AM5 | API/UI | Alta | Pendiente de ejecucion |
| CAT-03 | Catalogo | RF-03 | Filtrar motherboard por socket | Placas con sockets distintos | `category=MOTHERBOARD&socket=LGA 1700` | Aplicar filtro | Solo placas LGA 1700 | API/UI | Alta | Pendiente de ejecucion |
| CAT-04 | Catalogo | RF-03 | Rango de precio | Productos con precios variados | minPrice/maxPrice | Aplicar filtro | Resultados dentro del rango | API/UI | Alta | Pendiente de ejecucion |
| CAT-05 | Catalogo | RF-03 | Disponibilidad stock | Productos con y sin stock | `inStock=true/false` | Aplicar filtro | Coincide con stock | API/UI | Alta | Pendiente de ejecucion |
| CAT-06 | Catalogo | RF-13 | Solo ofertas | Productos con/sin oferta | `isOnSale=true` | Aplicar filtro | Solo ofertas activas | API/UI | Media | Pendiente de ejecucion |
| CAT-07 | Catalogo | RF-03 | Filtros combinados | CPU AMD AM5 con precios variados | cpuBrand+socket+precio | Aplicar filtros | Interseccion correcta | API/UI | Alta | Pendiente de ejecucion |
| CAT-08 | Catalogo | RF-03 | Filtros sin resultados | Filtro incompatible | CPU Intel + AM5 si no existe | Aplicar filtros | Estado vacio claro | UI | Media | Pendiente de ejecucion |
| CAT-09 | Catalogo | RF-03 | Filtros persistidos en URL | Catalogo abierto | Query params | Compartir/recargar URL | Se conservan filtros | E2E | Media | Pendiente de ejecucion |
| CAT-10 | Catalogo | RF-03 | Opciones dinamicas de filtros | Productos con specs cargadas | `/products/filter-options` | Consumir endpoint | Devuelve opciones existentes | API | Media | Pendiente de ejecucion |
| CAT-11 | Catalogo | RF-03 | Filtros CPU comerciales | Pagina Procesadores abierta | Panel filtros | Revisar UI | Muestra marca, socket, graficos integrados, precio, disponibilidad, oferta y orden; no muestra Buscar, Incluye cooler ni TDP | UI | Media | Pendiente de ejecucion |
| CAT-12 | Catalogo | RF-03 | Filtros Motherboard comerciales | Pagina Placas madre abierta | Panel filtros | Revisar UI | Orden: Marca, Precio, Plataforma, Socket, Formato, Disponibilidad, Oferta, Ordenar; no muestra Tipo de RAM, Slots M.2 ni Biostar | UI/API | Alta | Pendiente de ejecucion |
| CAT-13 | Catalogo | RF-03 | Filtros GPU comerciales | Pagina Graficas abierta | Panel filtros | Revisar UI | Orden: Marca ensambladora, Precio, Chipset, VRAM, Disponibilidad, Oferta, Ordenar; no muestra TDP minimo ni TDP maximo | UI/API | Alta | Pendiente de ejecucion |
| SALE-01 | Ofertas | RF-13 | Oferta desactivada no exige salePrice | Producto sin oferta | isOnSale=false | Guardar stock | Sin error salePrice | UI/API | Critica | Pendiente de ejecucion |
| SALE-02 | Ofertas | RF-13 | Oferta activa exige salePrice > 0 | Admin autenticado | isOnSale=true, salePrice vacio | Guardar | Error mayor a 0 | UI/API | Alta | Pendiente de ejecucion |
| SALE-03 | Ofertas | RF-13 | salePrice menor a price | Producto con price=1000 | salePrice=1000 | Guardar | Error menor al precio normal | UI/API | Alta | Pendiente de ejecucion |
| SALE-04 | Ofertas | RF-13 | Desactivar oferta persiste | Producto con oferta | isOnSale=false | Guardar y recargar | `isOnSale=false`, `salePrice=null` | E2E/API | Critica | Pendiente de ejecucion |
| SALE-05 | Ofertas | RF-13 | Precio normal no cambia | Producto existente | price=1000 | Guardar | DB muestra 1000.00 | API | Alta | Pendiente de ejecucion |
| SALE-06 | Ofertas | RF-13 | Crear producto no permite oferta inicial | Admin en Agregar Producto | isOnSale=true, salePrice=0 enviado maliciosamente | Crear producto | Backend fuerza `isOnSale=false` y `salePrice=null` | API | Critica | Pendiente de ejecucion |
| IMG-01 | Imagenes | RF-12 | Subir 1 a 5 imagenes producto | Admin autenticado | JPG/PNG/WEBP | Crear producto | Imagenes guardadas | E2E | Alta | Pendiente de ejecucion |
| IMG-02 | Imagenes | RF-12 | Recomendacion 550x550 | Admin abierto | Imagen no cuadrada | Seleccionar | Advertencia | UI | Baja | Pendiente de ejecucion |
| IMG-03 | Branding | RF-16 | Logo 400x200 | Admin autenticado | Logo local | Guardar branding | Header muestra logo | E2E | Media | Pendiente de ejecucion |
| IMG-04 | Banners | RF-16 | Banner 1920x500 | Admin autenticado | Imagen banner | Crear banner | Home muestra banner | E2E | Alta | Pendiente de ejecucion |
| IMG-05 | Banners | RF-16 | Sin banner mobile separado | Admin abierto | Form banner | Revisar campos | No hay input mobile | UI | Baja | Pendiente de ejecucion |
| IMG-06 | Imagenes | RF-12 | Fallback si imagen falla | Producto con URL rota | Ver catalogo | Cargar card | Placeholder limpio | UI | Media | Pendiente de ejecucion |
| BLD-01 | Builder | RF-04 | CPU AMD AM5 + board AM5 | Productos cargados | Ryzen AM5 + B650 | Seleccionar | Valido | E2E | Alta | Pendiente de ejecucion |
| BLD-02 | Builder | RF-04 | Intel LGA1700 + board AM5 | Productos cargados | Intel + AM5 | Seleccionar | Invalido | E2E | Alta | Pendiente de ejecucion |
| BLD-03 | Builder | RF-04 | RAM DDR4 + board DDR5 | Productos cargados | DDR4 + DDR5 | Seleccionar | Invalido | E2E | Alta | Pendiente de ejecucion |
| BLD-04 | Builder | RF-04 | Cooler socket incompatible | CPU elegido | Cooler sin socket CPU | Seleccionar | Bloqueo | E2E | Alta | Pendiente de ejecucion |
| BLD-05 | Builder | RF-04 | Cooler TDP insuficiente | CPU 125W | Cooler 95W | Seleccionar | Bloqueo | E2E | Alta | Pendiente de ejecucion |
| BLD-06 | Builder | RF-05 | PSU insuficiente | CPU/GPU altos | PSU baja | Seleccionar | Invalido | E2E | Alta | Pendiente de ejecucion |
| BLD-06A | Builder | RF-05 | PSU recomendada GPU como piso minimo | CPU/GPU con recomendacion fabricante | gpuPowerWatts bajo, recommendedPsuWatts mayor | Calcular fuente | Usa el mayor entre calculo real con margen y PSU recomendada por fabricante | Unit/E2E | Alta | Pendiente de ejecucion |
| BLD-07 | Builder | RF-04 | Storage M.2 incompatible | Board sin formato | SSD 22110 | Seleccionar | Invalido si aplica | E2E | Media | Pendiente de ejecucion |
| BLD-08 | Builder | RF-04 | Configuracion completa valida | Specs correctas | Componentes compatibles | Finalizar | Configuracion valida | E2E | Alta | Pendiente de ejecucion |
| CART-01 | Carrito | RF-10 | Agregar producto con stock | Producto stock > 0 | qty=1 | Agregar | Item en cesta | E2E | Alta | Pendiente de ejecucion |
| CART-02 | Carrito | RF-10 | Bloquear producto sin stock | Producto stock 0 | Click agregar | Intentar | Boton bloqueado | UI | Alta | Pendiente de ejecucion |
| CART-03 | Carrito | RF-10 | Cantidad mayor a stock | Stock limitado | qty > stock | Actualizar | Rechazo/control | UI/API | Alta | Pendiente de ejecucion |
| CART-04 | Checkout | RF-11 | Confirmar compra | Cliente logueado | Carrito valido | Checkout | Orden creada | E2E/API | Critica | Pendiente de ejecucion |
| CART-05 | Stock | RF-11 | Stock descuenta correctamente | Pago aprobado | qty=1 | Pagar | Stock -1 | API | Critica | Pendiente de ejecucion |
| CART-06 | Stock | RF-11 | Evitar stock negativo | Stock 1 | Compra concurrente | Ejecutar doble compra | Una rechazada | Integracion | Critica | Pendiente de ejecucion |
| PAY-01 | Pagos | RF-15 | Crear pago manual pendiente | Orden creada | Yape/Plin + codigo | Enviar | PENDING_REVIEW | E2E/API | Alta | Pendiente de ejecucion |
| PAY-02 | Pagos | RF-15 | Pago pendiente no descuenta definitivo | Pago pendiente | Revisar stock | Consultar | Stock sin descuento final | API | Alta | Pendiente de ejecucion |
| PAY-03 | Pagos | RF-15 | Aprobar pago descuenta stock | Admin autenticado | Payment ID | Aprobar | PAID y stock baja | API/UI | Critica | Pendiente de ejecucion |
| PAY-04 | Pagos | RF-15 | Rechazar pago no descuenta | Admin autenticado | Payment ID | Rechazar | REJECTED sin stock change | API/UI | Alta | Pendiente de ejecucion |
| PAY-05 | Auditoria | RF-14 | Auditoria de aprobacion | Pago manual | Aprobar | Revisar auditoria | Evento pago/stock | UI/API | Media | Pendiente de ejecucion |
| BRD-01 | Branding | RF-16 | Cambiar logo local | Admin autenticado | Imagen logo | Guardar | Header actualizado | E2E | Alta | Pendiente de ejecucion |
| BRD-02 | Branding | RF-16 | Cambiar nombre tienda | Admin autenticado | PCSystemStore | Guardar | Branding actualizado | API/UI | Media | Pendiente de ejecucion |
| BRD-03 | Banners | RF-16 | Crear banner | Admin autenticado | Imagen + activo | Guardar | Banner listado | E2E | Alta | Pendiente de ejecucion |
| BRD-04 | Banners | RF-16 | Desactivar banner | Banner activo | Toggle off | Home | No aparece | E2E | Alta | Pendiente de ejecucion |
| BRD-05 | Banners | RF-16 | Eliminar banner | Banner existente | Delete | Confirmar | No listado | E2E/API | Media | Pendiente de ejecucion |
| BRD-06 | Banners | RF-16 | Banner nuevo activo aparece home | Banner activo | Home | Recargar | Slide visible | E2E | Alta | Pendiente de ejecucion |
| AUD-01 | Auditoria | RF-14 | Crear producto auditado | Admin | Crear producto | Revisar historial | Evento CREATE_PRODUCT | API/UI | Alta | Pendiente de ejecucion |
| AUD-02 | Auditoria | RF-14 | Editar producto auditado | Admin | Editar specs | Revisar historial | Evento UPDATE_PRODUCT/SPECS | API/UI | Alta | Pendiente de ejecucion |
| AUD-03 | Auditoria | RF-14 | Cambio stock auditado | Admin | stock nuevo | Guardar | UPDATE_STOCK | API/UI | Alta | Pendiente de ejecucion |
| AUD-04 | Auditoria | RF-14 | Cambio precio auditado | Admin | price nuevo | Guardar | UPDATE_PRICE | API/UI | Alta | Pendiente de ejecucion |
| AUD-05 | Auditoria | RF-14 | Cambio imagen auditado | Admin | nueva imagen | Guardar | UPDATE_PRODUCT_IMAGE | API/UI | Media | Pendiente de ejecucion |
| AUD-06 | Auditoria | RF-14 | Venta/reduccion stock auditada | Orden pagada | Pago aprobado | Revisar | SALE/STOCK_DECREASE | API/UI | Alta | Pendiente de ejecucion |
| AUD-07 | Auditoria | RF-14 | Editor auditado | Admin | Crear/editar/desactivar | Revisar seguridad | Evento editor | API/UI | Media | Pendiente de ejecucion |
| AUD-08 | Auditoria | RF-14 | Separar auditoria | Logs mixtos | Abrir historial | Revisar tabs | Seguridad y productos separados | UI | Media | Pendiente de ejecucion |
| AI-01 | IA predictiva | RF-06 | Predictor con datos validos | Dataset valido | JSON/CSV | Ejecutar | Prediccion valida | pytest/manual | Alta | Pendiente de ejecucion |
| AI-02 | IA predictiva | RF-06 | JSON valido | Predictor activo | Entrada correcta | Ejecutar API | Respuesta JSON parseable | API | Media | Pendiente de ejecucion |
| AI-03 | IA predictiva | RF-06 | JSON corrupto | Entrada corrupta | JSON invalido | Ejecutar | Error controlado | API | Alta | Pendiente de ejecucion |
| AI-04 | IA predictiva | RF-06 | Error Python | Script falla | Simular error | Ejecutar | Backend no cae | Integracion | Alta | Pendiente de ejecucion |
| AI-05 | IA predictiva | RF-06 | Sin historial | Producto nuevo | Sin ventas | Predecir | Mensaje insuficiente | API | Media | Pendiente de ejecucion |
| AI-06 | IA predictiva | RF-07 | Producto critico alerta | Stock bajo/demanda alta | Ejecutar | Ver admin | Alerta visible | E2E/API | Alta | Pendiente de ejecucion |
| AI-07 | IA predictiva | RF-07 | Producto no critico | Stock normal | Ejecutar | Ver admin | Sin alerta critica | API | Media | Pendiente de ejecucion |
| SEC-01 | Seguridad | RF-01 | SQL Injection login | API auth | `' OR 1=1 --` | Enviar login | Rechazo | Seguridad | Critica | Pendiente de ejecucion |
| SEC-02 | Seguridad | RF-03 | SQL Injection busqueda | Catalogo | query malicioso | Buscar | Sin error/escape | Seguridad | Alta | Pendiente de ejecucion |
| SEC-03 | Seguridad | RF-02 | XSS descripcion producto | Admin | `<script>` | Crear/editar | Rechazo o escape | Seguridad | Alta | Pendiente de ejecucion |
| SEC-04 | Seguridad | RF-01 | Acceso directo endpoint admin | Sin rol admin | PATCH admin | Enviar | 401/403 | Seguridad | Critica | Pendiente de ejecucion |
| SEC-05 | Seguridad | RF-01 | CORS por entorno | Frontend local | Origin permitido/no permitido | Request | Control esperado | Seguridad | Alta | Pendiente de ejecucion |
| SEC-06 | Seguridad | RF-01 | Variables sensibles | Repo | Buscar secrets | Inspeccionar | Sin credenciales hardcodeadas | Seguridad | Alta | Pendiente de ejecucion |
| E2E-01 | E2E | RF-10/RF-11 | Cliente catalogo-producto-carrito-checkout | Cliente logueado | Producto con stock | Ejecutar flujo | Orden/pago segun metodo | E2E | Critica | Pendiente de ejecucion |
| E2E-02 | E2E | RF-02/RF-03 | Admin crea producto y aparece catalogo | Admin logueado | Producto nuevo | Crear y buscar | Visible | E2E | Alta | Pendiente de ejecucion |
| E2E-03 | E2E | RF-16 | Admin crea banner y aparece home | Admin logueado | Banner activo | Crear y home | Visible | E2E | Alta | Pendiente de ejecucion |
| E2E-04 | E2E | RF-02 | Admin edita stock y cliente ve actualizado | Producto existente | stock nuevo | Guardar y abrir detalle | Stock actualizado | E2E | Alta | Pendiente de ejecucion |
| E2E-05 | E2E | RF-15 | Pago manual pendiente-aprobacion-admin | Cliente/admin | Yape/Plin | Crear y aprobar | Pedido PAID | E2E | Critica | Pendiente de ejecucion |
