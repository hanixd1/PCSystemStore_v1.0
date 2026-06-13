from fastapi import APIRouter, HTTPException

from schemas.prediction_schema import PredictStockRequest, PredictStockResponse
from schemas.stock_prediction_schema import (
    StockRiskBatchInput,
    StockRiskBatchResponse,
    StockRiskInput,
    StockRiskResult,
)
from services.stock_prediction_service import (
    calculate_batch_stock_risk,
    calculate_stock_risk,
    predict_stock_risk,
)


router = APIRouter()


@router.post("", response_model=PredictStockResponse)
def predict_stock(payload: PredictStockRequest) -> PredictStockResponse:
    return predict_stock_risk(payload)


@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "stock_prediction",
        "mode": "HEURISTIC_V1",
    }


@router.post("/risk-score", response_model=StockRiskResult)
def risk_score(payload: StockRiskInput) -> StockRiskResult:
    try:
        return calculate_stock_risk(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="No se pudo calcular el riesgo predictivo de stock.",
        ) from exc


@router.post("/batch-risk-score", response_model=StockRiskBatchResponse)
def batch_risk_score(payload: StockRiskBatchInput) -> StockRiskBatchResponse:
    try:
        return calculate_batch_stock_risk(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="No se pudo calcular el riesgo predictivo de stock por lote.",
        ) from exc
