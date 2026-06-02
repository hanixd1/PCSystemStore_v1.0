from collections import Counter

from schemas.statistics_schema import (
    InventoryStatisticsResponse,
    StatisticsRequest,
    StatisticsResponse,
)


def get_number(value: object, fallback: float = 0) -> float:
    try:
        return float(value) if value is not None else fallback
    except (TypeError, ValueError):
        return fallback


def build_statistics_summary(payload: StatisticsRequest) -> StatisticsResponse:
    products = payload.products or []
    sales = payload.sales or []
    category_counter = Counter(
        str(product.get("category", "GENERAL")) for product in products if isinstance(product, dict)
    )

    low_stock = 0
    critical_stock = 0
    alerts: list[str] = []

    for product in products:
        if not isinstance(product, dict):
            continue

        stock = int(get_number(product.get("stock"), 0))
        name = str(product.get("name", "Producto"))
        if stock <= 0:
            critical_stock += 1
            alerts.append(f"{name} esta agotado o en stock critico.")
        elif stock <= 3:
            critical_stock += 1
            alerts.append(f"{name} tiene stock critico.")
        elif stock <= 8:
            low_stock += 1

    estimated_revenue = sum(
        get_number(sale.get("total"), 0)
        for sale in sales
        if isinstance(sale, dict)
    )

    return StatisticsResponse(
        totalProducts=len(products),
        lowStockProducts=low_stock,
        criticalStockProducts=critical_stock,
        estimatedRevenue=estimated_revenue,
        topCategories=[
            {"category": category, "count": count}
            for category, count in category_counter.most_common(5)
        ],
        alerts=alerts[:10],
    )


def build_inventory_statistics() -> InventoryStatisticsResponse:
    return InventoryStatisticsResponse(
        available=True,
        generatedBy="ai-service",
        riskProducts=[],
        message="Statistics service available",
    )
