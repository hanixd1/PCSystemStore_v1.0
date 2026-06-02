# PCSystemStore v1.0

Sistema web e-commerce especializado en hardware para la empresa **PCSystemStore**, orientado a la venta de componentes de computadora, gestión de inventario, configuración asistida de PC, administración de productos, importación masiva mediante Excel + ZIP de imágenes, análisis estadístico de inventario y preparación para integración con un microservicio de inteligencia artificial.

---

## Tabla de contenido

* [Descripción general](#descripción-general)
* [Objetivo del proyecto](#objetivo-del-proyecto)
* [Características principales](#características-principales)
* [Arquitectura del sistema](#arquitectura-del-sistema)
* [Tecnologías utilizadas](#tecnologías-utilizadas)
* [Estructura del proyecto](#estructura-del-proyecto)
* [Versiones del sistema](#versiones-del-sistema)
* [Manual de instalación local](#manual-de-instalación-local)
* [Variables de entorno](#variables-de-entorno)
* [Manual de uso](#manual-de-uso)
* [Importación masiva de productos](#importación-masiva-de-productos)
* [Módulo de estadística](#módulo-de-estadística)
* [Roles del sistema](#roles-del-sistema)
* [Comandos útiles](#comandos-útiles)
* [Pruebas recomendadas](#pruebas-recomendadas)
* [Estado actual del proyecto](#estado-actual-del-proyecto)
* [Roadmap](#roadmap)
* [Autor](#autor)
* [Licencia](#licencia)

---

## Descripción general

**PCSystemStore v1.0** es una plataforma web especializada para comercio electrónico de hardware. A diferencia de un e-commerce genérico, el sistema está diseñado para trabajar con productos técnicos como procesadores, placas madre, memorias RAM, tarjetas de video, fuentes de poder, gabinetes, almacenamiento, refrigeración, periféricos y equipos armados.

El sistema permite registrar productos con especificaciones técnicas, administrar stock, gestionar imágenes, controlar usuarios administrativos, importar productos de forma masiva, visualizar estadísticas de inventario y preparar la integración con un microservicio de IA para análisis de stock y recomendaciones.

---

## Objetivo del proyecto

El objetivo principal del sistema es modernizar la gestión comercial e inventario de PCSystemStore mediante una plataforma web que permita:

* Centralizar productos, precios, stock e imágenes.
* Reducir el tiempo de carga manual de productos.
* Evitar errores en la administración de componentes técnicos.
* Gestionar roles administrativos de forma segura.
* Preparar la integración con IA para análisis de inventario.
* Mejorar la experiencia de compra del cliente final.

---

## Características principales

### Catálogo público

* Visualización de productos por categorías.
* Página de detalle de producto.
* Soporte para imágenes de producto.
* Productos relacionados.
* Ofertas y precios visibles para el cliente.
* Control visual de stock disponible.

### Panel administrativo

* Gestión de productos.
* Gestión de empleados administrativos.
* Gestión de imágenes.
* Gestión de banners y marca.
* Gestión de pagos.
* Historial/auditoría.
* Módulo de estadística.
* Importación masiva de productos.

### Importación masiva

* Carga de productos desde archivo Excel `.xlsx`.
* Carga de imágenes desde archivo `.zip`.
* Asociación de imagen principal y galería por nombre de archivo.
* Validación previa antes de importar.
* Creación y actualización de productos.
* Soporte para múltiples imágenes por producto.
* Control de errores por fila.

### Estadística e inventario

* Resumen de productos.
* Productos sin stock.
* Productos con stock bajo.
* Productos en riesgo.
* Recomendaciones básicas de reposición.
* Estado de integración con microservicio IA.
* Fallback local si el servicio IA no está disponible.

### Seguridad y roles

* Autenticación con JWT.
* Separación de roles administrativos.
* Protección de rutas administrativas.
* Gestión de empleados internos.
* Protección del administrador principal.
* Restricción de importación masiva solo para administradores.

---

## Arquitectura del sistema

El proyecto utiliza una arquitectura modular compuesta por:

```txt
Frontend Next.js
        |
        | HTTP / JSON
        v
Backend NestJS
        |
        | Prisma ORM
        v
PostgreSQL / Neon

Backend NestJS
        |
        | HTTP opcional
        v
AI Service FastAPI
```

### Componentes principales

* **Frontend:** interfaz pública y panel administrativo.
* **Backend:** API principal, reglas de negocio, autenticación y persistencia.
* **Base de datos:** almacenamiento de usuarios, productos, pedidos, imágenes, pagos y auditoría.
* **AI Service:** microservicio Python/FastAPI para endpoints de estadística, chatbot y predicción de stock.
* **Cloudinary:** almacenamiento externo de imágenes de productos y recursos visuales.

---

## Tecnologías utilizadas

### Frontend

* Next.js
* React
* TypeScript
* TailwindCSS
* Axios
* Zustand
* React Icons

### Backend

* NestJS
* TypeScript
* Prisma ORM
* PostgreSQL / Neon
* JWT
* Multer
* Cloudinary
* XLSX
* ADM-ZIP
* Bcrypt

### AI Service

* Python
* FastAPI
* Servicios separados para chatbot, estadísticas y predicción de stock

### Herramientas complementarias

* GitHub
* Vercel
* Railway
* Neon Database
* Cloudinary
* ESLint
* Jest

---

## Estructura del proyecto

```txt
PCSystemStore_v1.0/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── uploads/
│   │   ├── audit/
│   │   ├── payments/
│   │   ├── orders/
│   │   ├── branding/
│   │   ├── statistics/
│   │   ├── ai/
│   │   └── prisma/
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── product/
│   │   ├── categoria/
│   │   ├── checkout/
│   │   └── tienda/
│   │
│   ├── components/
│   ├── lib/
│   ├── store/
│   ├── package.json
│   └── .env.local.example
│
├── ai-service/
│   ├── routers/
│   ├── services/
│   ├── schemas/
│   └── main.py
│
└── README.md
```

---

## Versiones del sistema

### v1.0.0 - Base funcional del e-commerce

Primera versión funcional del sistema.

Incluye:

* Catálogo público de productos.
* Panel administrativo.
* Creación y edición de productos.
* Gestión de imágenes.
* Gestión de usuarios administrativos.
* Roles base.
* Carrito y flujo de compra.
* Gestión de banners y marca.
* Integración inicial con backend y base de datos.

---

### v1.1.0 - Importación masiva, roles y estadística

Versión de mejora operativa.

Incluye:

* Limpieza del sistema de roles.
* Roles administrativos finales:

  * `ADMIN`
  * `EDITOR`
* Eliminación funcional de `EMPLOYEE`.
* Gestión de empleados desde el panel administrativo.
* Protección del administrador principal.
* Importación masiva de productos desde Excel.
* Carga masiva de imágenes desde ZIP.
* Validación de imágenes por nombre de archivo.
* Asociación de imagen principal y galería.
* Validación previa de productos antes de importar.
* Módulo estadístico básico de inventario.
* Fallback local si el microservicio IA no responde.
* Endpoints mínimos en AI Service para estadísticas.
* Preparación para predicción de stock y alertas inteligentes.

---

### v1.2.0 - Planificado

Mejoras previstas:

* Dashboard estadístico con gráficos reales.
* Análisis de ventas por periodo.
* Predicción de quiebres de stock con mayor precisión.
* Integración más profunda con el microservicio IA.
* Mejoras en configurador de PC.
* Validación avanzada de compatibilidad.
* Integración futura con Odoo para inventario y facturación.
* Mejoras de rendimiento en consultas de catálogo.
* Reportes exportables.

---

## Manual de instalación local

### Requisitos previos

Instalar:

* Node.js 20 o superior
* npm
* PostgreSQL o conexión a Neon
* Git
* Python 3.11 o superior, opcional para AI Service
* Cuenta de Cloudinary, si se probará carga real de imágenes

---

## Clonar repositorio

```bash
git clone https://github.com/hanixd1/PCSystemStore_v1.0.git
cd PCSystemStore_v1.0
```

---

## Instalación del backend

```bash
cd backend
npm install
```

Generar cliente Prisma:

```bash
npx prisma generate
```

Ejecutar migraciones:

```bash
npx prisma migrate deploy
```

O en desarrollo:

```bash
npx prisma db push
```

Ejecutar seed, si corresponde:

```bash
npm run seed
```

Iniciar backend en desarrollo:

```bash
npm run start:dev
```

---

## Instalación del frontend

```bash
cd frontend
npm install
```

Iniciar frontend en desarrollo:

```bash
npm run dev
```

Por defecto, el frontend se ejecutará en:

```txt
http://localhost:3000
```

---

## Instalación del AI Service

```bash
cd ai-service
python -m venv .venv
```

Activar entorno virtual en Windows:

```bash
.venv\Scripts\activate
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Levantar FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

Endpoints mínimos esperados:

```txt
GET /statistics/health
GET /statistics/inventory
```

---

## Variables de entorno

### Backend

Crear archivo:

```txt
backend/.env
```

Variables sugeridas:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

JWT_SECRET="CAMBIAR_POR_UN_SECRETO_SEGURO"
JWT_EXPIRES_IN="3h"

FRONTEND_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000"

CLOUDINARY_CLOUD_NAME="tu_cloud_name"
CLOUDINARY_API_KEY="tu_api_key"
CLOUDINARY_API_SECRET="tu_api_secret"

AI_SERVICE_URL="http://localhost:8000"
```

---

### Frontend

Crear archivo:

```txt
frontend/.env.local
```

Variables sugeridas:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

Si el backend usa prefijo `/api`, configurar:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

## Manual de uso

### Acceso al panel administrativo

El panel administrativo permite gestionar el sistema desde una interfaz protegida.

Funciones principales:

* Gestión de productos.
* Gestión de empleados.
* Gestión de imágenes.
* Gestión de banners y marca.
* Gestión de pagos.
* Historial de cambios.
* Estadísticas.
* Importación masiva.

---

## Roles del sistema

### ADMIN

Rol con acceso completo.

Permisos principales:

* Gestionar productos.
* Gestionar empleados.
* Crear administradores y editores.
* Bloquear o activar empleados.
* Usar importación masiva.
* Ver estadísticas.
* Gestionar pagos.
* Gestionar banners y marca.
* Ver auditoría.
* Ejecutar acciones críticas.

### EDITOR

Rol administrativo limitado.

Permisos principales:

* Crear o editar productos, si está habilitado.
* Actualizar información operativa.
* Apoyar en la gestión del catálogo.
* No puede usar importación masiva.
* No puede gestionar empleados.
* No puede modificar configuraciones críticas.

### Cliente

Usuario final del e-commerce.

Permisos principales:

* Navegar catálogo.
* Ver productos.
* Agregar productos al carrito.
* Gestionar su cuenta.
* Realizar pedidos según el flujo disponible.

---

## Gestión de empleados

La sección **Gestión de Empleados** permite administrar accesos internos del panel.

Funciones:

* Crear empleado.
* Crear usuario con rol `ADMIN` o `EDITOR`.
* Editar nombre.
* Cambiar contraseña.
* Cambiar rol.
* Activar o bloquear empleado.
* Proteger la cuenta principal del sistema.

La cuenta principal de PCSystemStore no debe ser bloqueada, eliminada ni degradada.

---

## Importación masiva de productos

La importación masiva permite cargar productos desde un archivo Excel y asociar imágenes desde un archivo ZIP.

### Flujo general

1. Ingresar al panel administrativo.
2. Ir a **Importar productos**.
3. Seleccionar categoría.
4. Seleccionar tipo de producto.
5. Subir archivo Excel `.xlsx`.
6. Subir archivo ZIP `.zip`.
7. Validar importación.
8. Revisar errores o advertencias.
9. Confirmar importación.

---

### Columnas generales del Excel

Columnas mínimas recomendadas:

```txt
nombre
numeroParte
marca
precio
stock
descripcion
imagenPrincipal
imagenesArchivos
```

Ejemplo para placas madre:

```txt
nombre
numeroParte
marca
precio
stock
descripcion
imagenPrincipal
imagenesArchivos
socket
formato
tipoRam
slotsRam
slotsM2
frecuenciaRam
m2_2230
m2_2242
m2_2260
m2_2280
m2_22110
```

---

### Imágenes

El ZIP debe contener los archivos declarados en el Excel.

Ejemplo:

```txt
b650m-d3hp-ax-1.jpg
b650m-d3hp-ax-2.jpg
b840m-d3hp-wf6e-1.jpg
b840m-d3hp-wf6e-2.jpg
```

En Excel:

```txt
imagenPrincipal: b650m-d3hp-ax-1.jpg
imagenesArchivos: b650m-d3hp-ax-1.jpg; b650m-d3hp-ax-2.jpg
```

Formatos permitidos:

```txt
jpg
jpeg
png
webp
```

---

### Seguridad de importación

* Solo usuarios `ADMIN` pueden importar productos.
* La validación previa no debe guardar datos.
* La confirmación importa solo si no existen errores críticos.
* Las imágenes deben existir dentro del ZIP.
* No se aceptan rutas peligrosas dentro del ZIP.
* No se aceptan extensiones no permitidas.

---

## Módulo de estadística

El módulo de estadística muestra un análisis operativo inicial del inventario.

Incluye:

* Total de productos.
* Productos sin stock.
* Productos con stock bajo.
* Productos en riesgo.
* Valor estimado de inventario.
* Alertas de stock.
* Recomendaciones de reposición.
* Estado del motor IA.

Si el microservicio IA no está disponible, el backend usa un análisis local básico.

Estados posibles:

```txt
Stock normal
Stock bajo
Sin stock
Riesgo de quiebre
```

---

## AI Service

El microservicio IA está preparado para manejar funcionalidades independientes del backend principal.

Módulos considerados:

* Chatbot.
* Estadísticas.
* Predicción de stock.

Endpoints mínimos actuales:

```txt
GET /statistics/health
GET /statistics/inventory
```

El backend puede consultar el AI Service mediante:

```env
AI_SERVICE_URL="http://localhost:8000"
```

Si `AI_SERVICE_URL` no está configurado o el servicio no responde, el sistema debe continuar funcionando con fallback local.

---

## Comandos útiles

### Backend

Instalar dependencias:

```bash
cd backend
npm install
```

Ejecutar en desarrollo:

```bash
npm run start:dev
```

Compilar:

```bash
npm run build
```

Ejecutar tests:

```bash
npm test
```

Ejecutar tests E2E:

```bash
npm run test:e2e
```

Generar Prisma Client:

```bash
npm run prisma:generate
```

Ejecutar migraciones en producción:

```bash
npm run prisma:migrate:deploy
```

Validar Prisma:

```bash
npm run prisma:validate
```

Abrir Prisma Studio:

```bash
npm run prisma:studio
```

---

### Frontend

Instalar dependencias:

```bash
cd frontend
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

Compilar:

```bash
npm run build
```

Iniciar versión compilada:

```bash
npm run start
```

Ejecutar lint:

```bash
npm run lint
```

Verificar TypeScript:

```bash
npx tsc --noEmit
```

---

### Limpieza de dependencias

Si hay problemas con `npm ci` o `package-lock.json`:

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

En Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

---

## Pruebas recomendadas

Antes de subir cambios a producción, validar:

### Autenticación y roles

* Login de administrador.
* Login de editor.
* Login de cliente.
* Acceso denegado a rutas no autorizadas.
* Editor no debe poder usar importación masiva.
* Cliente no debe entrar al panel admin.

### Productos

* Crear producto manualmente.
* Editar producto.
* Subir imagen individual.
* Ver producto en catálogo público.
* Ver detalle de producto.

### Importación masiva

* Importar archivo Excel válido.
* Importar ZIP válido.
* Probar imagen faltante.
* Probar columna obligatoria faltante.
* Probar producto existente.
* Confirmar actualización.
* Confirmar creación.

### Estadística

* Probar con AI Service apagado.
* Probar con AI Service encendido.
* Verificar resumen de inventario.
* Verificar productos sin stock.
* Verificar productos con stock bajo.

### Build

Backend:

```bash
cd backend
npm run build
npm test
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## Estado actual del proyecto

El sistema se encuentra en una versión funcional inicial con despliegue en producción.

Estado por módulo:

| Módulo                       | Estado                  |
| ---------------------------- | ----------------------- |
| Catálogo público             | Funcional               |
| Panel administrativo         | Funcional               |
| Gestión de productos         | Funcional               |
| Gestión de empleados         | Funcional               |
| Roles ADMIN/EDITOR           | Funcional               |
| Importación masiva           | Funcional               |
| Imágenes con Cloudinary      | Funcional               |
| Estadística básica           | Funcional               |
| AI Service                   | Integración inicial     |
| Predicción avanzada de stock | En desarrollo           |
| Facturación electrónica      | Fuera de alcance actual |
| Integración Odoo             | Planificado             |

---

## Roadmap

### Corto plazo

* Mejorar validaciones de importación por cada categoría.
* Agregar más plantillas Excel.
* Mejorar dashboard estadístico.
* Agregar gráficos de ventas e inventario.
* Mejorar manejo de errores visuales.

### Mediano plazo

* Integrar Odoo para inventario.
* Sincronizar stock en tiempo real.
* Mejorar predicción de quiebres de stock.
* Implementar alertas administrativas avanzadas.
* Mejorar configurador de PC.

### Largo plazo

* Integración contable.
* Facturación electrónica.
* Reportes gerenciales.
* Modelos predictivos entrenados con histórico real.
* Recomendaciones comerciales basadas en IA.
* Auditoría avanzada para cumplimiento y trazabilidad.

---

## Consideraciones de seguridad

* No almacenar credenciales en el repositorio.
* Usar variables de entorno.
* No exponer `JWT_SECRET`.
* No exponer credenciales de Cloudinary.
* No permitir importación masiva a usuarios no administradores.
* Proteger la cuenta principal del sistema.
* Validar archivos antes de procesarlos.
* Evitar subir archivos peligrosos o rutas maliciosas dentro de ZIP.

---

## Consideraciones para producción

Antes de desplegar:

1. Ejecutar build de backend.
2. Ejecutar build de frontend.
3. Validar variables de entorno.
4. Ejecutar migraciones Prisma.
5. Probar login admin.
6. Probar catálogo público.
7. Probar carga de imágenes.
8. Probar importación masiva con pocos productos.
9. Probar módulo de estadística.
10. Revisar logs de backend.

---

## Autor

Desarrollado por:

**Renzo Quispe Meza**
Proyecto: PCSystemStore
Área: Ingeniería de Sistemas / Desarrollo Web / Inteligencia Artificial aplicada a inventario

Repositorio:

```txt
https://github.com/hanixd1/PCSystemStore_v1.0
```

---

## Licencia

Este proyecto fue desarrollado con fines técnicos y empresariales para PCSystemStore.

El uso, modificación o distribución del código debe realizarse con autorización del propietario del proyecto.
