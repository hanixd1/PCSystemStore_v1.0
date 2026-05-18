from fastapi import APIRouter

from schemas.statistics_schema import StatisticsRequest, StatisticsResponse
from services.statistics_service import build_statistics_summary


router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "module": "statistics"}


@router.post("/summary", response_model=StatisticsResponse)
def summary(payload: StatisticsRequest) -> StatisticsResponse:
    return build_statistics_summary(payload)
