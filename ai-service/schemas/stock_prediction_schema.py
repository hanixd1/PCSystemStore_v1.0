from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
RiskStatus = Literal["NORMAL", "WATCH", "RISK", "CRITICAL"]
RiskMode = Literal["HEURISTIC_V1", "ML_MODEL", "INSUFFICIENT_DATA"]


class StockRiskInput(BaseModel):
    productId: str | None = None
    name: str = Field(min_length=1)
    category: str | None = None
    productType: str | None = None
    stockActual: int = Field(ge=0)
    precio: float | None = Field(default=None, ge=0)
    ventasUltimos7Dias: int | None = Field(default=None, ge=0)
    ventasUltimos30Dias: int | None = Field(default=None, ge=0)
    diasReposicionEstimados: int | None = Field(default=None, gt=0)
    umbralStockBajo: int | None = Field(default=None, ge=0)
    fechaUltimaVenta: datetime | None = None
    fechaUltimaReposicion: datetime | None = None


class StockRiskConfig(BaseModel):
    defaultLowStockThreshold: int = Field(default=3, ge=0)
    defaultLeadTimeDays: int = Field(default=7, gt=0)
    riskThreshold: int = Field(default=70, ge=0, le=100)
    criticalThreshold: int = Field(default=90, ge=0, le=100)


class StockRiskSignals(BaseModel):
    stockPressure: int = Field(ge=0, le=100)
    salesVelocity: int = Field(ge=0, le=100)
    replenishmentRisk: int = Field(ge=0, le=100)
    dataQuality: int = Field(ge=0, le=100)


class StockRiskResult(BaseModel):
    productId: str | None = None
    name: str
    riskScore: int = Field(ge=0, le=100)
    riskLevel: RiskLevel
    status: RiskStatus
    estimatedDaysToStockout: int | None = None
    recommendedAction: str
    recommendedQuantity: int = Field(ge=0)
    signals: StockRiskSignals
    reasons: list[str] = Field(default_factory=list)
    mode: RiskMode = "HEURISTIC_V1"


class StockRiskBatchInput(BaseModel):
    products: list[StockRiskInput] = Field(default_factory=list)
    config: StockRiskConfig = Field(default_factory=StockRiskConfig)


class StockRiskBatchSummary(BaseModel):
    totalProducts: int
    riskProducts: int
    criticalProducts: int
    insufficientDataProducts: int


class StockRiskBatchResponse(BaseModel):
    mode: RiskMode = "HEURISTIC_V1"
    generatedAt: datetime
    summary: StockRiskBatchSummary
    items: list[StockRiskResult] = Field(default_factory=list)
