"""Contracts of the series panel and its profile."""

from __future__ import annotations

import pandas as pd
import pandera.pandas as pa
from pandera.typing import Series

LEVELS = ["total", "category", "sku"]
CHANNELS = ["total", "vecinos", "facturado", "total_dedup"]
FREQUENCIES = ["weekly", "monthly"]
SPLITS = ["development", "test", "excluded"]
PATTERNS = ["smooth", "erratic", "intermittent", "lumpy", "no_demand"]


class _Strict(pa.DataFrameModel):
    class Config:
        strict = True
        coerce = True


class PanelRow(_Strict):
    """Units sold of one series in one period."""

    series_id: Series[str]
    frequency: Series[str] = pa.Field(isin=FREQUENCIES)
    channel: Series[str] = pa.Field(isin=CHANNELS)
    level: Series[str] = pa.Field(isin=LEVELS)
    key: Series[str]
    period_start: Series[pd.Timestamp]
    period_end: Series[pd.Timestamp]
    split: Series[str] = pa.Field(isin=SPLITS)
    recorded_days: Series[int] = pa.Field(ge=0)
    units: Series[int] = pa.Field(ge=0)
    amount: Series[float] = pa.Field(ge=0.0)
    lines: Series[int] = pa.Field(ge=0)

    @pa.dataframe_check
    @classmethod
    def one_row_per_series_and_period(cls, df: pd.DataFrame) -> pd.Series[bool]:
        return ~df.duplicated(["series_id", "period_start"])


class SeriesProfile(_Strict):
    """Demand pattern of a series on the development span (plan 2.6.2)."""

    series_id: Series[str] = pa.Field(unique=True)
    frequency: Series[str] = pa.Field(isin=FREQUENCIES)
    channel: Series[str] = pa.Field(isin=CHANNELS)
    level: Series[str] = pa.Field(isin=LEVELS)
    key: Series[str]
    periods: Series[int] = pa.Field(ge=0)
    periods_with_sales: Series[int] = pa.Field(ge=0)
    zero_share: Series[float] = pa.Field(ge=0.0, le=1.0)
    adi: Series[float] = pa.Field(nullable=True, ge=1.0)
    cv2: Series[float] = pa.Field(nullable=True, ge=0.0)
    pattern: Series[str] = pa.Field(isin=PATTERNS)
    units: Series[int] = pa.Field(ge=0)
    mean_units: Series[float] = pa.Field(ge=0.0)
    first_sale: Series[pd.Timestamp] = pa.Field(nullable=True)
    last_sale: Series[pd.Timestamp] = pa.Field(nullable=True)
    selected: Series[bool]
    # Control variable, demand structure (plan Table 15): development lines only.
    months_with_sales: Series[int] = pa.Field(ge=0)
    customers: Series[int] = pa.Field(ge=0)
    top_customer_share: Series[float] = pa.Field(nullable=True, ge=0.0, le=1.0)
    top_sku_share: Series[float] = pa.Field(nullable=True, ge=0.0, le=1.0)
