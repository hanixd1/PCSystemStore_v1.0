from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "8000"))
    model_path: str = os.getenv("MODEL_PATH", "")
    frontend_url: str = os.getenv("FRONTEND_URL", "")
    backend_url: str = os.getenv("BACKEND_URL", "")


settings = Settings()
