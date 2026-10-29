"""Weekly and monthly demand panels by channel, at total, category and SKU level (plan 2.6.2).

Gross demand is the quantity of the configured sale movements in the vecinos record plus the items
of valid delivered receipts (protocol amendment v3). A line is placed in the period of its
``date_start``. Periods are complete calendar weeks (Monday-Sunday) or months inside the recorded
span; each period also reports how many days the channel's source covers. A period without any
vecinos sheet is a zero confirmed by the owner (amendment v3, D2), and stays visible through
``recorded_days``.

Channels: ``total`` (both sources, primary), ``vecinos``, ``facturado`` and ``total_dedup`` (total
without receipt lines that have a vecinos line of the same SKU and quantity a few days apart).
"""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd

from pcsforecast.catalog.build import strip_serials
from pcsforecast.protocol.windows import Windows, complete_periods, split_label
from pcsforecast.series.schemas import PanelRow

LEVEL_TOTAL = "total"
LEVEL_CATEGORY = "category"
LEVEL_SKU = "sku"
TOTAL_KEY = "ALL"
CHANNEL_TOTAL = "total"
CHANNEL_VECINOS = "vecinos"
CHANNEL_FACTURADO = "facturado"
CHANNEL_DEDUP = "total_dedup"
DEMAND_COLUMNS = [
    "line_id",
    "date_start",
    "quantity",
    "amount",
    "product_text",
    "sku_id",
    "category",
    "customer_code",  # pseudonymous code (plan 2.6.2: concentration in customers); never in panels
]


def demand_lines(
    lines: pd.DataFrame,
    catalog_texts: pd.DataFrame,
    movements: Iterable[str],
    confidences: Iterable[str],
) -> pd.DataFrame:
    """Valid demand lines with their SKU and category."""
    keep = (
        (lines["status"] == "valid")
        & lines["movement_type"].isin(list(movements))
        & lines["date_confidence"].isin(list(confidences))
    )
    columns = ["line_id", "date_start", "quantity", "amount", "product_text", "customer_code"]
    selected = lines.loc[keep].reindex(columns=columns)
    return _with_sku(selected, catalog_texts)


def _with_sku(lines: pd.DataFrame, catalog_texts: pd.DataFrame) -> pd.DataFrame:
    mapping = catalog_texts[["product_text", "sku_id", "category"]]
    if "customer_code" not in lines:
        lines = lines.assign(customer_code=None)
    merged = lines.merge(mapping, on="product_text", how="left", validate="many_to_one")
    if merged["sku_id"].isna().any():
        raise ValueError("demand lines whose product text is missing from the catalog")
    return merged[DEMAND_COLUMNS]


def receipt_texts(retail: pd.DataFrame) -> pd.DataFrame:
    """Retail items as catalog input: product text without serial numbers."""
    items = retail.dropna(subset=["description"])
    return pd.DataFrame(
        {
            "line_id": items["line_id"],
            "status": "valid",
            "product_text": items["description"].map(strip_serials),
            "quantity": items["quantity"],
        }
    )


def receipt_demand(
    retail: pd.DataFrame, catalog_texts: pd.DataFrame, tax_rate: float
) -> pd.DataFrame:
    """Items of valid receipts as demand lines, valued at the price the customer paid."""
    items = retail.dropna(subset=["description"])
    lines = pd.DataFrame(
        {
            "line_id": items["line_id"],
            "date_start": pd.to_datetime(items["issue_date"]),
            "quantity": items["quantity"],
            "amount": items["net_amount"] * (1.0 + tax_rate),
            "product_text": items["description"].map(strip_serials),
            "customer_code": items.get("customer_code"),
        }
    )
    return _with_sku(lines, catalog_texts)


def possible_duplicates(
    vecinos: pd.DataFrame, receipts: pd.DataFrame, window_days: int
) -> pd.Series:
    """Receipt lines with a vecinos line of the same SKU and quantity within ``window_days``.

    An upper bound of the sales recorded in both sources: it also catches coincidences.
    """
    pairs = (
        receipts[["sku_id", "quantity", "date_start"]]
        .reset_index()
        .merge(
            vecinos[["sku_id", "quantity", "date_start"]],
            on=["sku_id", "quantity"],
            suffixes=("", "_vecinos"),
        )
    )
    near = (pairs["date_start"] - pairs["date_start_vecinos"]).abs() <= pd.Timedelta(
        days=window_days
    )
    flagged = set(pairs.loc[near, "index"])
    return pd.Series(receipts.index.isin(list(flagged)), index=receipts.index, name="duplicate")


def channel_demand(
    vecinos: pd.DataFrame, receipts: pd.DataFrame, duplicate: pd.Series, channel: str
) -> pd.DataFrame:
    """Demand lines of one channel."""
    sources = {
        CHANNEL_TOTAL: [vecinos, receipts],
        CHANNEL_VECINOS: [vecinos],
        CHANNEL_FACTURADO: [receipts],
        CHANNEL_DEDUP: [vecinos, receipts[~duplicate]],
    }[channel]
    return pd.concat(
        [frame.reindex(columns=DEMAND_COLUMNS) for frame in sources], ignore_index=True
    )


def recorded_days(sheet_dates: pd.DataFrame, valid_sheets: Iterable[int]) -> pd.Series:
    """Calendar days covered by at least one sheet that has valid lines."""
    sheets = sheet_dates[
        sheet_dates["sheet_index"].isin(list(valid_sheets)) & sheet_dates["date_start"].notna()
    ]
    days = {
        day
        for start, end in zip(sheets["date_start"], sheets["date_end"], strict=True)
        for day in pd.date_range(start, end, freq="D")
    }
    return pd.Series(1, index=pd.DatetimeIndex(sorted(days)), name="recorded")


def receipt_days(receipts: pd.DataFrame) -> pd.Series:
    """Calendar days with at least one delivered receipt."""
    days = sorted(pd.to_datetime(receipts["date_start"]).dt.normalize().unique())
    return pd.Series(1, index=pd.DatetimeIndex(days), name="recorded")


def channel_days(vecinos_days: pd.Series, receipts_days: pd.Series, channel: str) -> pd.Series:
    """Days covered by the sources of a channel."""
    if channel == CHANNEL_VECINOS:
        return vecinos_days
    if channel == CHANNEL_FACTURADO:
        return receipts_days
    union = vecinos_days.index.union(receipts_days.index)
    return pd.Series(1, index=union, name="recorded")


def calendar(
    study_start: pd.Timestamp,
    windows: Windows,
    frequency: str,
    days: pd.Series,
    channel: str = CHANNEL_TOTAL,
) -> pd.DataFrame:
    """Complete periods of the recorded span with their split and recorded-day count."""
    periods = complete_periods(study_start.date(), windows.record_end, frequency)
    periods["frequency"] = frequency
    periods["channel"] = channel
    periods["split"] = split_label(periods["period_start"], periods["period_end"], windows)
    periods["recorded_days"] = [
        int(days.loc[start:end].sum())
        for start, end in zip(periods["period_start"], periods["period_end"], strict=True)
    ]
    return periods


def _assign_period(dates: pd.Series, periods: pd.DataFrame) -> pd.Series:
    starts = periods["period_start"].to_numpy()
    ends = periods["period_end"].to_numpy()
    position = np.searchsorted(starts, dates.to_numpy(), side="right") - 1
    valid = (position >= 0) & (dates.to_numpy() <= ends[np.clip(position, 0, None)])
    result = pd.Series(pd.NaT, index=dates.index, dtype="datetime64[ns]")
    result[valid] = starts[position[valid]]
    return result


def build_panel(demand: pd.DataFrame, periods: pd.DataFrame) -> pd.DataFrame:
    """Long panel: one row per series and period, zeros where nothing was sold."""
    frequency = str(periods["frequency"].iloc[0])
    channel = str(periods["channel"].iloc[0])
    lines = demand.assign(period_start=_assign_period(demand["date_start"], periods)).dropna(
        subset=["period_start"]
    )
    lines = lines.assign(total=TOTAL_KEY)
    frames = []
    for level, key_column in (
        (LEVEL_TOTAL, "total"),
        (LEVEL_CATEGORY, "category"),
        (LEVEL_SKU, "sku_id"),
    ):
        sums = (
            lines.groupby([key_column, "period_start"])
            .agg(units=("quantity", "sum"), amount=("amount", "sum"), lines=("line_id", "size"))
            .reset_index()
            .rename(columns={key_column: "key"})
        )
        keys = sorted(sums["key"].unique())
        grid = pd.MultiIndex.from_product(
            [keys, periods["period_start"]], names=["key", "period_start"]
        ).to_frame(index=False)
        full = grid.merge(sums, on=["key", "period_start"], how="left").fillna(
            {"units": 0, "amount": 0.0, "lines": 0}
        )
        full["level"] = level
        frames.append(full)
    panel = pd.concat(frames, ignore_index=True)
    panel = panel.merge(
        periods[["period_start", "period_end", "split", "recorded_days"]], on="period_start"
    )
    panel["frequency"] = frequency
    panel["channel"] = channel
    panel["series_id"] = (
        frequency + ":" + channel + ":" + panel["level"] + ":" + panel["key"].astype(str)
    )
    panel["units"] = panel["units"].round().astype(int)
    panel["lines"] = panel["lines"].astype(int)
    ordered = panel[list(PanelRow.to_schema().columns)]
    ordered = ordered.sort_values(["series_id", "period_start"]).reset_index(drop=True)
    return PanelRow.validate(ordered)
