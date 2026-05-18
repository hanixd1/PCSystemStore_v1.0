# PCSystemStore AI Service

Microservicio FastAPI modular para PCSystemStore. Contiene tres dominios separados:

- `chatbot`: asistente comercial Alex basado en reglas y catalogo real.
- `stock_prediction`: prediccion de riesgo de quiebre de stock.
- `statistics`: estructura inicial para analitica del panel admin.

## Estructura

```text
ai-service/
├── main.py
├── core/
│   └── config.py
├── routers/
│   ├── chatbot.py
│   ├── statistics.py
│   └── stock_prediction.py
├── schemas/
│   ├── chatbot_schema.py
│   ├── statistics_schema.py
│   └── prediction_schema.py
└── services/
    ├── chatbot_service.py
    ├── statistics_service.py
    └── stock_prediction_service.py
```

## Ejecucion Local

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

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
- `POST /predict-stock`
- `GET /statistics/health`
- `POST /statistics/summary`

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

## Railway

Servicio apuntando a `ai-service`.

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

La implementacion actual no usa LLM. Alex responde con reglas, estado conversacional y productos enviados por el backend desde el catalogo real.
