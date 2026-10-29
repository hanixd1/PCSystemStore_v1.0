from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import Depends, FastAPI

from core.config import settings
from core.security import require_internal_api_key

# The forecasting system reads its series and model weights from its own project folder.
os.environ.setdefault("PCS_PROJECT_ROOT", str(Path(__file__).resolve().parent / "pronostico"))

from chatbot.router import router as chatbot_router  # noqa: E402
from pcsforecast.service.router import router as forecast_router  # noqa: E402
from pcsforecast.service.router import warm_up_in_background  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.forecast_warm_up:
        warm_up_in_background()
    yield


# Interactive docs and the OpenAPI schema are only exposed outside production.
docs_enabled = not settings.is_production

app = FastAPI(
    title="PCSystemStore AI Service",
    version="2.0.0",
    description="Microservicio de IA para PCSystemStore: chatbot Puchi y sistema de pronostico.",
    lifespan=lifespan,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

# No CORS middleware: only the backend calls this service (server to server), so no browser
# origin is ever allowed.
internal_only = [Depends(require_internal_api_key)]
app.include_router(chatbot_router, prefix="/chat", tags=["Chatbot"], dependencies=internal_only)
app.include_router(
    forecast_router,
    prefix="/forecast",
    tags=["Sistema de pronostico"],
    dependencies=internal_only,
)


# async: served on the event loop, so the Railway health check answers even when every worker
# thread of the sync routes is busy computing forecasts.
@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "pcsystemstore-ai-service", "status": "ok"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "pcsystemstore-ai-service"}
