import logging
import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from core.config import settings


logger = logging.getLogger(__name__)

INTERNAL_API_KEY_HEADER = "X-Internal-API-Key"

_api_key_header = APIKeyHeader(name=INTERNAL_API_KEY_HEADER, auto_error=False)


def require_internal_api_key(provided: str | None = Security(_api_key_header)) -> None:
    """Accept only requests from the backend, which sends the shared key."""
    expected = settings.internal_api_key
    if not expected:
        if settings.is_production:
            logger.error("INTERNAL_API_KEY no configurada: se rechazan las solicitudes.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio no configurado.",
            )
        # Local development without a key: open, as before.
        return
    if not provided or not secrets.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado.")
