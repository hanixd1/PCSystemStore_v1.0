from pydantic import BaseModel, Field


class StatisticsRequest(BaseModel):
    products: list[dict] = Field(default_factory=list)
    orders: list[dict] = Field(default_factory=list)
    sales: list[dict] = Field(default_factory=list)


class StatisticsResponse(BaseModel):
    totalProducts: int
    lowStockProducts: int
    criticalStockProducts: int
    estimatedRevenue: float
    topCategories: list[dict]
    alerts: list[str]
