# PCSystemStore AI Service

Microservicio FastAPI de PCSystemStore. Un solo proceso (`uvicorn main:app`) sirve dos modulos
separados:

- `chatbot/`: asistente comercial Puchi basado en reglas y catalogo real (`/chat`).
- `pronostico/`: sistema de pronostico de demanda de la tesis (paquete `pcsforecast`), con su
  capa de produccion `pcsforecast/service` montada en `/forecast`.

## Estructura

```text
ai-service/
|-- main.py                 # monta /chat y /forecast
|-- core/config.py
|-- chatbot/
|   |-- router.py
|   |-- schemas.py
|   |-- service.py
|   `-- tests/
|-- pronostico/             # proyecto de la tesis (parte del monorepo, ver su README)
|   |-- src/pcsforecast/service/   # capa de produccion (F11)
|   |-- data/service/03_series/    # series corregidas que usa el servicio (no van a Git)
|   `-- models_cache/              # pesos de Chronos (no van a Git)
`-- tests/                  # pruebas de las rutas HTTP
```

## Ejecucion local

```bash
cd ai-service
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-forecast.txt   # con Chronos (PyTorch)
# o: .venv/bin/pip install -r requirements.txt       # liviano, pronostico con SES
.venv/bin/pip install -r requirements-dev.txt          # pytest + httpx para las pruebas
.venv/bin/python -m pytest
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

`main.py` no ejecuta `uvicorn.run(...)` (alerta SonarQube `python:S8392`).

Al arrancar, el servicio carga en segundo plano las series y el modelo (unos 15 s la primera
vez). `FORECAST_WARM_UP=false` lo desactiva (por ejemplo en pruebas).

## Variables

```env
ENVIRONMENT=development
PORT=8000
INTERNAL_API_KEY=                       # mismo valor que en el backend; obligatorio en produccion
FORECAST_WARM_UP=true
# Opcionales del pronostico:
# PCS_PROJECT_ROOT=./pronostico          (por defecto)
# PCS_SERVICE_SERIES=/ruta/a/03_series   (por defecto pronostico/data/service/03_series)
```

## Seguridad

- Solo el backend llama a este servicio. `/chat` y `/forecast/*` exigen la cabecera
  `X-Internal-API-Key` con el valor de `INTERNAL_API_KEY`. Sin clave configurada solo quedan
  abiertos si `ENVIRONMENT` es `development`, `dev`, `local` o `test`; cualquier otro valor
  (`production`, `staging`, una errata) responde 503. `/health` es publico.
- Sin CORS: ningun origen de navegador esta permitido.
- `/docs`, `/redoc` y `/openapi.json` solo existen en esos mismos entornos de desarrollo. La
  imagen Docker fija `ENVIRONMENT=production`.

## Datos del pronostico en despliegue y CI

`pronostico/data/` y `pronostico/outputs/` nunca van a Git. Las pruebas (`tests/conftest.py`)
generan una tienda sintetica con `pcsforecast.service.synthetic`, asi que CI no necesita datos.
En Railway, las series se suben a un volumen privado con
`python -m pcsforecast.service.bundle <carpeta>` y `PCS_SERVICE_SERIES` apunta a el (ver
`DEPLOYMENT.md`).

## Endpoints

- `GET /health`
- `POST /chat`
- `GET /forecast/health`
- `GET /forecast/overview`: ultimo mes con datos y rango de meses pronosticables.
- `GET /forecast/month?month=2026-12&threshold=150`: unidades esperadas (mediana y rango
  80 %), probabilidad de vender al menos `threshold` unidades, de superar el mismo mes del ano
  anterior, pronostico por categoria y productos con mayor probabilidad de venta.
- `POST /forecast/stock-coverage`: stock por categoria web contra la demanda pronosticada
  (probabilidad de quiebre). Lo usa el dashboard de inventario del backend.
- `GET /forecast/research`: resultados de la prueba final de la tesis.

Las rutas antiguas `/statistics`, `/stock-prediction` y `/predict-stock` (heuristica
`HEURISTIC_V1`) se eliminaron.

## Modelo de pronostico

- Total y categorias: Chronos-Bolt con ajuste ligero (mejor modelo en la tesis, HE1). Los
  pesos ajustados se generan con `python -m pcsforecast.service.fit` (unos 40 s) cada vez que
  se actualizan las series. Sin PyTorch se usa SES con cuantiles empiricos.
- Productos (SKU): probabilidad de vender al menos una unidad en el mes con TSB.
- La exactitud se valido a 1 mes (3 meses como sensibilidad). Meses mas lejanos se marcan
  como extrapolacion.

## Actualizar el pronostico con las ventas de la tienda web

Las series terminan en el ultimo mes de los registros de la empresa (agosto de 2026). Para que
el modelo no se quede congelado, cada mes:

1. Backend: `npm run export:web-sales -- --out=web_sales.csv` (ordenes `PAID` por mes de pago
   en hora de Lima y categoria web; deja fuera el mes en curso; solo lectura).
2. `cd ai-service/pronostico` y `python -m pcsforecast.service.web_sales ../../backend/web_sales.csv`
   escribe `data/service/03_series/web/panel_web.parquet` (canal `web`, no cambia el pronostico).
   Con `--add-to-total` las ventas web se suman al canal `total` que pronostica el servicio y los
   meses nuevos se completan con cero en cada categoria. Usarlo solo si los registros propios de
   esos meses no incluyen ya las ordenes web (las boletas de la web podrian estar en `facturado`).
3. `python -m pcsforecast.service.fit` (reajusta Chronos), `python -m pcsforecast.service.precomputed`
   (cuantiles de Chronos para servir sin PyTorch) y reiniciar el ai-service. En Railway, volver a
   generar el bundle (`python -m pcsforecast.service.bundle`) y subirlo al volumen.

Los SKU no se extienden: los productos web no estan enlazados a los SKU de la tesis.

## Ejemplo /chat

Request:

```json
{
  "message": "busco una rtx 5060",
  "conversationState": {
    "intent": null,
    "budget": null,
    "usage": null,
    "includesPeripherals": null,
    "mentionedProducts": []
  },
  "catalog": [
    {
      "id": "1",
      "name": "Gigabyte GeForce RTX 5060 GAMING OC 8G",
      "category": "GPU",
      "price": 1650,
      "stock": 5,
      "imageUrl": "https://example.com/gpu.jpg",
      "productUrl": "/product/1"
    }
  ]
}
```

Response:

```json
{
  "reply": "Encontre una opcion en la tienda: Gigabyte GeForce RTX 5060 GAMING OC 8G por S/. 1650.00. Estado: en stock.",
  "intent": "product_search",
  "conversationState": {
    "intent": "product_search",
    "budget": null,
    "usage": null,
    "includesPeripherals": null,
    "mentionedProducts": ["rtx 5060"]
  },
  "products": [
    {
      "id": "1",
      "name": "Gigabyte GeForce RTX 5060 GAMING OC 8G",
      "price": 1650,
      "stock": 5,
      "imageUrl": "https://example.com/gpu.jpg",
      "productUrl": "/product/1"
    }
  ],
  "status": "ok"
}
```

La implementacion actual no usa LLM. Puchi responde con reglas, estado conversacional
y productos enviados por el backend desde el catalogo real.
