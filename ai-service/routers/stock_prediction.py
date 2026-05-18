from fastapi import APIRouter

from schemas.prediction_schema import PredictStockRequest, PredictStockResponse
from services.stock_prediction_service import predict_stock_risk


router = APIRouter()


@router.post("", response_model=PredictStockResponse)
def predict_stock(payload: PredictStockRequest) -> PredictStockResponse:
    return predict_stock_risk(payload)
