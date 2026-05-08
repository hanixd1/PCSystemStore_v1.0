INSERT INTO "StoreBranding" ("id", "storeName", "logoAlt", "createdAt", "updatedAt")
VALUES ('default-store-branding', 'PCSystemStore', 'PCSystemStore', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "HomeBanner" (
    "id",
    "title",
    "subtitle",
    "imageUrl",
    "linkUrl",
    "sortOrder",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES
(
    'seed-banner-rtx-serie-40',
    'RTX Serie 40',
    'Potencia grafica para gaming y creacion',
    'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1920&q=80',
    '/categoria/graficas',
    1,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'seed-banner-procesadores',
    'Procesadores AMD e Intel',
    'Componentes listos para tu proximo ensamble',
    'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1920&q=80',
    '/categoria/cpu',
    2,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'seed-banner-promociones',
    'Promociones PCSystemStore',
    'Renueva tu setup con ofertas seleccionadas',
    'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=1920&q=80',
    '/ofertas',
    3,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
