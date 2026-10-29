"""Demand-pattern profile (ADI, CV², SBC class) and SKU selection by rotation (plan 2.4.2, 2.6.2).

Everything here uses development periods only, so test-window sales never influence which
series are studied or how they are classified.
"""

from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from pcsforecast.series.build import LEVEL_CATEGORY, LEVEL_SKU, LEVEL_TOTAL, TOTAL_KEY
from pcsforecast.series.schemas import SeriesProfile


def classify(adi: float | None, cv2: float | None, adi_cutoff: float, cv2_cutoff: float) -> str:
    """Syntetos-Boylan-Croston class; ``no_demand`` when the series never sold."""
    if adi is None or cv2 is None:
        return "no_demand"
    frequent = adi < adi_cutoff
    stable = cv2 < cv2_cutoff
    if frequent:
        return "smooth" if stable else "erratic"
    return "intermittent" if stable else "lumpy"


def demand_statistics(units: np.ndarray) -> tuple[float | None, float | None]:
    """ADI (periods per demand occurrence) and CV² of the non-zero sizes."""
    sizes = units[units > 0]
    if sizes.size == 0:
        return None, None
    adi = units.size / sizes.size
    mean = float(sizes.mean())
    cv2 = float(sizes.std(ddof=0) / mean) ** 2
    return float(adi), cv2


def select_skus(demand: pd.DataFrame, test_start: date, share: float) -> set[str]:
    """Smallest set of SKUs that accumulates ``share`` of development units."""
    development = demand[demand["date_start"] < pd.Timestamp(test_start)]
    units = development.groupby("sku_id")["quantity"].sum().reset_index()
    ordered = units.sort_values(["quantity", "sku_id"], ascending=[False, True])
    cumulative = ordered["quantity"].cumsum() / ordered["quantity"].sum()
    needed = int((cumulative < share).sum()) + 1
    return set(ordered["sku_id"].iloc[:needed])


STRUCTURE_COLUMNS = ["months_with_sales", "customers", "top_customer_share", "top_sku_share"]


def _top_share(units: pd.Series, by: pd.Series) -> float:
    """Share of ``units`` of the largest group of ``by`` (NaN without groups or units)."""
    known = by.notna()
    totals = units[known].groupby(by[known]).sum()
    total = float(totals.sum())
    return float(totals.max() / total) if total > 0 else float("nan")


def demand_structure(demand: pd.DataFrame, test_start: date) -> pd.DataFrame:
    """Months with sales and concentration in customers and products per level and key.

    Plan 2.6.2 and Table 15 (control variable): computed on development lines only. Customers
    are counted by their pseudonymous code; lines without a code are left out of the customer
    measures. The product concentration is the share of the series' largest SKU (undefined at
    SKU level, where it is always one).
    """
    lines = demand[demand["date_start"] < pd.Timestamp(test_start)].assign(total=TOTAL_KEY)
    lines = lines.assign(month=lines["date_start"].dt.to_period("M"))
    rows = []
    for level, column in (
        (LEVEL_TOTAL, "total"),
        (LEVEL_CATEGORY, "category"),
        (LEVEL_SKU, "sku_id"),
    ):
        for key, group in lines.groupby(column, sort=True):
            sold = group[group["quantity"] > 0]
            rows.append(
                {
                    "level": level,
                    "key": str(key),
                    "months_with_sales": int(sold["month"].nunique()),
                    "customers": int(sold["customer_code"].dropna().nunique()),
                    "top_customer_share": _top_share(sold["quantity"], sold["customer_code"]),
                    "top_sku_share": float("nan")
                    if level == LEVEL_SKU
                    else _top_share(sold["quantity"], sold["sku_id"]),
                }
            )
    return pd.DataFrame(rows, columns=["level", "key", *STRUCTURE_COLUMNS])


def profile_panel(
    panel: pd.DataFrame,
    selected_skus: set[str],
    adi_cutoff: float,
    cv2_cutoff: float,
    structure: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """One profile row per series, from its development periods.

    ``structure`` (from ``demand_structure``) adds months with sales and concentration; series
    without development sales get zero months and customers and undefined shares.
    """
    development = panel[panel["split"] == "development"]
    records: list[dict[str, object]] = []
    for series_id, rows in development.groupby("series_id", sort=True):
        units = rows["units"].to_numpy()
        adi, cv2 = demand_statistics(units)
        sold = rows.loc[rows["units"] > 0, "period_start"]
        level = str(rows["level"].iloc[0])
        key = str(rows["key"].iloc[0])
        records.append(
            {
                "series_id": series_id,
                "frequency": rows["frequency"].iloc[0],
                "channel": rows["channel"].iloc[0],
                "level": level,
                "key": key,
                "periods": int(units.size),
                "periods_with_sales": int((units > 0).sum()),
                "zero_share": float((units == 0).mean()) if units.size else 0.0,
                "adi": adi,
                "cv2": cv2,
                "pattern": classify(adi, cv2, adi_cutoff, cv2_cutoff),
                "units": int(units.sum()),
                "mean_units": float(units.mean()) if units.size else 0.0,
                "first_sale": sold.min() if not sold.empty else pd.NaT,
                "last_sale": sold.max() if not sold.empty else pd.NaT,
                "selected": level != LEVEL_SKU or key in selected_skus,
            }
        )
    profile = pd.DataFrame(records)
    if structure is None:
        structure = pd.DataFrame(columns=["level", "key", *STRUCTURE_COLUMNS])
    profile = profile.merge(structure, on=["level", "key"], how="left", validate="one_to_one")
    profile = profile.fillna({"months_with_sales": 0, "customers": 0})
    profile[["months_with_sales", "customers"]] = profile[
        ["months_with_sales", "customers"]
    ].astype(int)
    profile[["top_customer_share", "top_sku_share"]] = profile[
        ["top_customer_share", "top_sku_share"]
    ].astype(float)
    return SeriesProfile.validate(profile)
