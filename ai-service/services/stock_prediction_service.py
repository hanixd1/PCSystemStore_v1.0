from schemas.prediction_schema import (
    PredictStockRequest,
    PredictStockResponse,
    ProductInput,
    RiskLevel,
    StockPrediction,
)


def calculate_risk(product: ProductInput) -> tuple[RiskLevel, float]:
    stock = product.stock
    monthly_sales = product.monthlySales

    if stock <= 0:
        risk: RiskLevel = "critical"
        probability = 0.98
    elif stock <= 3:
        risk = "high"
        probability = 0.85
    elif stock <= 8:
        risk = "medium"
        probability = 0.6
    else:
        risk = "low"
        probability = 0.25

    if monthly_sales >= stock and stock > 0:
        if risk == "low":
            risk = "medium"
            probability = max(probability, 0.55)
        elif risk == "medium":
            risk = "high"
            probability = max(probability, 0.78)
        elif risk == "high":
            risk = "critical"
            probability = max(probability, 0.92)

    return risk, min(probability, 0.99)


def build_message(risk: RiskLevel) -> str:
    return {
        "low": "Stock estable. Mantener seguimiento regular.",
        "medium": "Demanda moderada. Revisar reposicion proximamente.",
        "high": "Alta demanda. Riesgo de quiebre de stock.",
        "critical": "Stock critico o agotado. Reponer con prioridad.",
    }[risk]


def calculate_reorder(product: ProductInput, risk: RiskLevel) -> int:
    monthly_sales = max(product.monthlySales, 1)
    target_cover = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "critical": 4,
    }[risk]
    target_stock = monthly_sales * target_cover
    return max(0, target_stock - product.stock)


def predict_stock_risk(payload: PredictStockRequest) -> PredictStockResponse:
    predictions: list[StockPrediction] = []

    for product in payload.products:
        risk, probability = calculate_risk(product)
        predictions.append(
            StockPrediction(
                productId=product.id,
                productName=product.name,
                risk=risk,
                probability=probability,
                message=build_message(risk),
                recommendedReorder=calculate_reorder(product, risk),
            )
        )

    return PredictStockResponse(predictions=predictions)
