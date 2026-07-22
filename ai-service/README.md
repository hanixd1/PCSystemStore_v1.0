# PCSystemStore AI Service

Microservicio FastAPI modular para PCSystemStore. Contiene tres dominios separados:

- `chatbot`: asistente comercial Alex basado en reglas y catalogo real.
- `stock_prediction`: analisis predictivo inicial de riesgo de quiebre de stock.
- `statistics`: estructura inicial para analitica del panel admin.

## Estructura

```text
ai-service/
|-- main.py
|-- core/
|   `-- config.py
|-- routers/
|   |-- chatbot.py
|   |-- statistics.py
|   `-- stock_prediction.py
|-- schemas/
|   |-- chatbot_schema.py
|   |-- statistics_schema.py
|   |-- stock_prediction_schema.py
|   `-- prediction_schema.py
`-- services/
    |-- chatbot_service.py
    |-- statistics_service.py
    `-- stock_prediction_service.py
```

## Ejecucion local

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

`main.py` se mantiene como modulo ASGI importable y no ejecuta `uvicorn.run(...)`
internamente. Esto evita enlazar el servicio a todas las interfaces desde el codigo y
resuelve la alerta SonarQube `python:S8392`. Para ejecucion local se usa
`127.0.0.1`; en despliegue, el proveedor debe indicar el comando de arranque
correspondiente segun su runtime.

## Variables

```env
ENVIRONMENT=development
PORT=8000
MODEL_PATH=
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000
```

## Endpoints

- `GET /health`
- `POST /chat`
- `POST /stock-prediction` (ruta canónica)
- `POST /predict-stock` (legacy, compatibilidad hacia atrás)
- `GET /stock-prediction/health`
- `POST /stock-prediction/risk-score`
- `POST /stock-prediction/batch-risk-score`
- `GET /statistics/health`
- `POST /statistics/summary`

## Motor de riesgo predictivo de stock

## Compatibilidad de rutas de stock

`/stock-prediction` es el prefijo canónico. `/predict-stock` se mantiene como
ruta legacy para clientes existentes y usa exactamente el mismo router y
payloads. No debe eliminarse sin una deprecación versionada y coordinación con
los consumidores.

La version actual usa `HEURISTIC_V1`: un scoring heuristico operativo, no un
modelo ML entrenado. Combina presion de stock, velocidad de ventas cuando el
backend la envia, riesgo por tiempo de reposicion y calidad de datos. Si no hay
historico de ventas, el motor no eleva automaticamente el stock bajo a riesgo
alto; solo lo marca como seguimiento (`WATCH`) salvo que el producto este sin
stock.

Este contrato queda preparado para reemplazar `HEURISTIC_V1` por `ML_MODEL`
cuando exista historico suficiente para entrenamiento y validacion.

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

## Ejemplo /predict-stock

```json
{
  "products": [
    {
      "id": "1",
      "name": "AMD Ryzen 5 7600X",
      "category": "CPU",
      "stock": 2,
      "price": 1250,
      "monthlySales": 8
    }
  ]
}
```

## Ejemplo /statistics/summary

```json
{
  "products": [],
  "orders": [],
  "sales": []
}
```

Devuelve una estructura valida aunque no existan datos reales.

La implementacion actual no usa LLM. Alex responde con reglas, estado conversacional
y productos enviados por el backend desde el catalogo real.
