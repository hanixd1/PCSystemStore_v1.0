from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import chatbot, statistics, stock_prediction

app = FastAPI(
    title="PCSystemStore AI Service",
    version="1.0.0",
    description="Microservicio modular de IA para PCSystemStore.",
)

allowed_origins = [
    origin
    for origin in [settings.frontend_url, settings.backend_url]
    if origin
]

if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(chatbot.router, prefix="/chat", tags=["Chatbot"])
# Backward compatibility:
# /predict-stock is the legacy route kept for existing clients.
# /stock-prediction is the canonical route.
app.include_router(stock_prediction.router, prefix="/stock-prediction", tags=["Stock Prediction"])
app.include_router(stock_prediction.router, prefix="/predict-stock", tags=["Stock Prediction"])
app.include_router(statistics.router, prefix="/statistics", tags=["Statistics"])


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "pcsystemstore-ai-service", "status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pcsystemstore-ai-service"}
