from fastapi import APIRouter

from schemas.statistics_schema import (
    InventoryStatisticsResponse,
    StatisticsRequest,
    StatisticsResponse,
)
from services.statistics_service import build_inventory_statistics, build_statistics_summary


router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "statistics"}


@router.get("/inventory", response_model=InventoryStatisticsResponse)
def inventory() -> InventoryStatisticsResponse:
    return build_inventory_statistics()


@router.post("/summary", response_model=StatisticsResponse)
def summary(payload: StatisticsRequest) -> StatisticsResponse:
    return build_statistics_summary(payload)
