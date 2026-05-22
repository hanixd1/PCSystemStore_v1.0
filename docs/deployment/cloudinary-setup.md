# Cloudinary Setup

## Variables requeridas

Configurar en `backend/.env` local y en Railway backend:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

No subir `.env` ni credenciales reales al repositorio.

## Carpetas usadas

El backend sube imagenes a Cloudinary con `resource_type: image` y URLs seguras `https`.

- Productos: `pcsystemstore/products`
- Banners: `pcsystemstore/banners`
- Branding/logo: `pcsystemstore/branding`
- Comprobantes/pagos: `pcsystemstore/payments`

El endpoint generico `POST /admin/uploads/image` acepta `type` opcional:

- `type=products`
- `type=banners`
- `type=branding`
- `type=payments`

Si no se envia `type`, usa `pcsystemstore/products` por compatibilidad con cargas existentes.

## Prueba local

1. Confirmar variables Cloudinary en `backend/.env`.
2. Levantar backend.
3. Subir imagen desde el panel admin.
4. Verificar que la respuesta incluya:
   - `url`
   - `secureUrl`
   - `publicId`

La URL guardada en BD debe iniciar con:

```text
https://res.cloudinary.com/
```

## Que revisar en BD

- `Product.images` debe contener URLs `https`.
- `HomeBanner.imageUrl` debe contener URL `https`.
- `StoreBranding.logoUrl` debe contener URL `https`.
- No deben guardarse rutas locales como `/uploads/...`, `localhost` o rutas de filesystem.

## Que revisar en Cloudinary

En Cloudinary Dashboard:

- Confirmar que el asset aparece en la carpeta esperada.
- Confirmar que el asset tiene `secure_url`.
- Confirmar que el archivo no imagen fue rechazado por el backend.
- Confirmar que archivos sobre el limite de Multer fueron rechazados.

## Railway

Railway no debe depender de almacenamiento local para uploads. Configurar las variables Cloudinary en el servicio backend y mantener `memoryStorage` con limites de Multer.
