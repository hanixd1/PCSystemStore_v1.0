from datetime import datetime, timezone
from math import ceil

from schemas.prediction_schema import (
    PredictStockRequest,
    PredictStockResponse,
    StockPrediction,
)
from schemas.stock_prediction_schema import (
    StockRiskBatchInput,
    StockRiskBatchResponse,
    StockRiskBatchSummary,
    StockRiskConfig,
    StockRiskInput,
    StockRiskResult,
    StockRiskSignals,
)


INSUFFICIENT_DATA_REASON = "Datos históricos insuficientes para predicción completa."


def clamp(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(maximum, round(value)))


def calculate_daily_velocity(product: StockRiskInput) -> tuple[float, bool]:
    has_7_days = product.ventasUltimos7Dias is not None
    has_30_days = product.ventasUltimos30Dias is not None

    velocity_7 = (product.ventasUltimos7Dias or 0) / 7 if has_7_days else None
    velocity_30 = (product.ventasUltimos30Dias or 0) / 30 if has_30_days else None

    if velocity_7 is not None and velocity_30 is not None:
        weighted_velocity = (velocity_7 * 0.6) + (velocity_30 * 0.4)
        return max(weighted_velocity, velocity_7 * 0.85), True

    if velocity_7 is not None:
        return velocity_7, True

    if velocity_30 is not None:
        return velocity_30, True

    return 0, False


def calculate_stock_pressure(stock: int, low_threshold: int) -> int:
    threshold = max(low_threshold, 1)

    if stock <= 0:
        return 100

    if stock <= threshold:
        pressure = 70 + ((threshold - stock + 1) / (threshold + 1)) * 20
        return clamp(pressure, 70, 90)

    if stock <= threshold * 2:
        pressure = 60 - ((stock - threshold - 1) / threshold) * 15
        return clamp(pressure, 40, 60)

    if stock <= threshold * 4:
        return 20

    return 5


def calculate_sales_velocity_signal(
    daily_velocity: float,
    estimated_days_to_stockout: float | None,
) -> int:
    if daily_velocity <= 0 or estimated_days_to_stockout is None:
        return 0

    if estimated_days_to_stockout <= 3:
        return 100
    if estimated_days_to_stockout <= 7:
        return 82
    if estimated_days_to_stockout <= 14:
        return 58
    if estimated_days_to_stockout <= 30:
        return 35

    return 15


def calculate_replenishment_risk(
    estimated_days_to_stockout: float | None,
    lead_time_days: int,
    stock: int,
    low_threshold: int,
) -> int:
    if stock <= 0:
        return 100

    if estimated_days_to_stockout is None:
        return 30 if stock <= low_threshold else 10

    if estimated_days_to_stockout <= 0:
        return 100

    ratio = lead_time_days / estimated_days_to_stockout
    if ratio >= 1.5:
        return 95
    if ratio >= 1:
        return 82
    if ratio >= 0.75:
        return 60
    if ratio >= 0.5:
        return 35

    return 15


def calculate_data_quality(product: StockRiskInput, has_sales_history: bool) -> int:
    has_7_days = product.ventasUltimos7Dias is not None
    has_30_days = product.ventasUltimos30Dias is not None

    if has_7_days and has_30_days:
        return 90

    if has_sales_history:
        return 65

    if product.fechaUltimaVenta or product.fechaUltimaReposicion:
        return 45

    return 25


def resolve_level_and_status(
    score: int,
    stock: int,
    config: StockRiskConfig,
) -> tuple[str, str]:
    if stock <= 0 or score >= config.criticalThreshold:
        return "CRITICAL", "CRITICAL"

    if score >= config.riskThreshold:
        return "HIGH", "RISK"

    if score >= 50:
        return "MEDIUM", "WATCH"

    if score >= 25:
        return "LOW", "WATCH"

    return "NONE", "NORMAL"


def build_recommended_action(risk_level: str, status: str) -> str:
    if status == "CRITICAL":
        return "Reponer urgente"

    if risk_level == "HIGH":
        return "Reponer pronto"

    if status == "WATCH":
        return "Monitorear y revisar reposición"

    return "Sin acción inmediata"


def calculate_recommended_quantity(
    product: StockRiskInput,
    risk_level: str,
    daily_velocity: float,
    lead_time_days: int,
    low_threshold: int,
) -> int:
    stock = product.stockActual

    if daily_velocity > 0:
        target_stock = ceil(daily_velocity * (lead_time_days + 7))
        minimum = 5 if risk_level in {"HIGH", "CRITICAL"} else max(low_threshold, 1)
        return max(0, max(target_stock, minimum) - stock)

    if stock <= 0:
        return max(low_threshold * 2, 5)

    if stock <= low_threshold:
        return max(1, (low_threshold * 2) - stock)

    return 0


def build_reasons(
    product: StockRiskInput,
    low_threshold: int,
    daily_velocity: float,
    estimated_days_to_stockout: float | None,
    lead_time_days: int,
    has_sales_history: bool,
) -> list[str]:
    reasons: list[str] = []

    if product.stockActual <= 0:
        reasons.append("El producto no tiene stock disponible.")
    elif product.stockActual <= low_threshold:
        reasons.append("El stock actual es bajo.")

    if daily_velocity > 0 and estimated_days_to_stockout is not None:
        if estimated_days_to_stockout <= 7:
            reasons.append("La rotación reciente indica posible quiebre en menos de 7 días.")
        elif estimated_days_to_stockout <= 14:
            reasons.append("La cobertura estimada de stock es menor a dos semanas.")

        if lead_time_days > estimated_days_to_stockout:
            reasons.append(
                "El tiempo estimado de reposición es mayor a los días de cobertura."
            )

    if not has_sales_history:
        reasons.append(INSUFFICIENT_DATA_REASON)

    if not reasons:
        reasons.append("No se detectan señales fuertes de quiebre inmediato.")

    return reasons


def calculate_stock_risk(
    product: StockRiskInput,
    config: StockRiskConfig | None = None,
) -> StockRiskResult:
    resolved_config = config or StockRiskConfig()
    low_threshold = product.umbralStockBajo
    if low_threshold is None:
        low_threshold = resolved_config.defaultLowStockThreshold

    lead_time_days = product.diasReposicionEstimados or resolved_config.defaultLeadTimeDays
    daily_velocity, has_sales_history = calculate_daily_velocity(product)
    estimated_days = (
        product.stockActual / daily_velocity if daily_velocity > 0 else None
    )

    stock_pressure = calculate_stock_pressure(product.stockActual, low_threshold)
    sales_velocity = calculate_sales_velocity_signal(daily_velocity, estimated_days)
    replenishment_risk = calculate_replenishment_risk(
        estimated_days,
        lead_time_days,
        product.stockActual,
        low_threshold,
    )
    data_quality = calculate_data_quality(product, has_sales_history)

    if product.stockActual <= 0:
        score = 97
    else:
        score = clamp(
            (stock_pressure * 0.4)
            + (sales_velocity * 0.25)
            + (replenishment_risk * 0.25)
            + (data_quality * 0.1)
        )

        if not has_sales_history:
            score = min(score, 55 if product.stockActual <= low_threshold else 25)
        elif estimated_days is not None and estimated_days <= lead_time_days:
            score = clamp(score + 8)

    risk_level, status = resolve_level_and_status(score, product.stockActual, resolved_config)
    recommended_action = build_recommended_action(risk_level, status)
    recommended_quantity = calculate_recommended_quantity(
        product,
        risk_level,
        daily_velocity,
        lead_time_days,
        low_threshold,
    )
    reasons = build_reasons(
        product,
        low_threshold,
        daily_velocity,
        estimated_days,
        lead_time_days,
        has_sales_history,
    )

    return StockRiskResult(
        productId=product.productId,
        name=product.name,
        riskScore=score,
        riskLevel=risk_level,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        estimatedDaysToStockout=ceil(estimated_days) if estimated_days is not None else None,
        recommendedAction=recommended_action,
        recommendedQuantity=recommended_quantity,
        signals=StockRiskSignals(
            stockPressure=stock_pressure,
            salesVelocity=sales_velocity,
            replenishmentRisk=replenishment_risk,
            dataQuality=data_quality,
        ),
        reasons=reasons,
        mode="HEURISTIC_V1",
    )


def calculate_batch_stock_risk(payload: StockRiskBatchInput) -> StockRiskBatchResponse:
    items = [
        calculate_stock_risk(product, payload.config)
        for product in payload.products
    ]

    risk_products = sum(
        1
        for item in items
        if item.riskLevel in {"HIGH", "CRITICAL"} or item.status in {"RISK", "CRITICAL"}
    )
    critical_products = sum(1 for item in items if item.riskLevel == "CRITICAL")
    insufficient_data_products = sum(
        1 for item in items if INSUFFICIENT_DATA_REASON in item.reasons
    )

    return StockRiskBatchResponse(
        mode="HEURISTIC_V1",
        generatedAt=datetime.now(timezone.utc),
        summary=StockRiskBatchSummary(
            totalProducts=len(items),
            riskProducts=risk_products,
            criticalProducts=critical_products,
            insufficientDataProducts=insufficient_data_products,
        ),
        items=items,
    )


def predict_stock_risk(payload: PredictStockRequest) -> PredictStockResponse:
    """Compatibility adapter for the legacy POST /predict-stock endpoint."""
    predictions: list[StockPrediction] = []

    for product in payload.products:
        risk_result = calculate_stock_risk(
            StockRiskInput(
                productId=product.id,
                name=product.name,
                category=product.category,
                stockActual=product.stock,
                precio=product.price,
                ventasUltimos30Dias=product.monthlySales,
                umbralStockBajo=3,
            )
        )
        legacy_risk = risk_result.riskLevel.lower()
        if legacy_risk == "none":
            legacy_risk = "low"

        predictions.append(
            StockPrediction(
                productId=product.id,
                productName=product.name,
                risk=legacy_risk,  # type: ignore[arg-type]
                probability=risk_result.riskScore / 100,
                message=" ".join(risk_result.reasons),
                recommendedReorder=risk_result.recommendedQuantity,
            )
        )

    return PredictStockResponse(predictions=predictions)
