from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()

DEVELOPMENT_ENVIRONMENTS = frozenset({"development", "dev", "local", "test"})


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "8000"))
    # Shared secret with the backend (header X-Internal-API-Key). Only the backend calls this
    # service; the browser never does.
    internal_api_key: str = os.getenv("INTERNAL_API_KEY", "").strip()
    # Load the forecasting model on startup so the first admin request is fast.
    forecast_warm_up: bool = os.getenv("FORECAST_WARM_UP", "true").lower() == "true"

    @property
    def is_production(self) -> bool:
        # Fail closed: only an explicit development value relaxes the API key and the docs, so a
        # typo or a "staging" deployment is treated as production.
        return self.environment.strip().lower() not in DEVELOPMENT_ENVIRONMENTS


settings = Settings()
