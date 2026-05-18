from typing import Literal

from pydantic import BaseModel, Field


class ProductInput(BaseModel):
    id: str
    name: str
    category: str = "GENERAL"
    stock: int = Field(ge=0)
    price: float = Field(ge=0)
    monthlySales: int = Field(default=0, ge=0)


class PredictStockRequest(BaseModel):
    products: list[ProductInput] = Field(default_factory=list)


RiskLevel = Literal["low", "medium", "high", "critical"]


class StockPrediction(BaseModel):
    productId: str
    productName: str
    risk: RiskLevel
    probability: float = Field(ge=0, le=1)
    message: str
    recommendedReorder: int = Field(ge=0)


class PredictStockResponse(BaseModel):
    predictions: list[StockPrediction]
