"""Synthetic service data: a fictitious store with the layout of ``data/service/03_series``.

``data/`` and ``outputs/`` never go to Git, so CI (GitHub Actions) and any checkout without the
company data use this generator to exercise every ``/forecast`` route. Every number is drawn from
a seeded random generator; no product, customer or result of the real record appears here.

    python -m pcsforecast.service.synthetic /tmp/pcs-synthetic

writes a project root whose ``data/service/03_series`` the service can read
(``PCS_PROJECT_ROOT=/tmp/pcs-synthetic``).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pcsforecast.service.research import FREEZE_DOC, PROFILE_FILE, SNAPSHOT_FILE

SEED = 20261028
FIRST_MONTH = "2024-01-01"
MONTHS = 32
SEALED_MONTHS = 6
CATEGORIES = {
    "keyboard_mouse": "Teclado y mouse",
    "gpu": "Tarjeta de video",
    "memory": "Memoria RAM",
}
SKUS = (
    ("sku-001", "Teclado de prueba", "keyboard_mouse", 0.8),
    ("sku-002", "Mouse de prueba", "keyboard_mouse", 0.5),
    ("sku-003", "Tarjeta de video de prueba", "gpu", 0.3),
    ("sku-004", "Memoria de prueba", "memory", 0.6),
)
PANEL_COLUMNS = (
    "series_id",
    "frequency",
    "channel",
    "level",
    "key",
    "period_start",
    "period_end",
    "split",
    "recorded_days",
    "units",
    "amount",
    "lines",
)
UNIT_PRICE = 100.0
VECINOS_SHARE = 0.6
INTERMITTENT_ZERO_SHARE = 0.3


def _rows(
    level: str, key: str, channel: str, units: np.ndarray, months: pd.DatetimeIndex
) -> list[dict[str, Any]]:
    ends = months + pd.offsets.MonthEnd(0)
    split = ["development"] * (len(months) - SEALED_MONTHS) + ["test"] * SEALED_MONTHS
    return [
        {
            "series_id": f"monthly:{channel}:{level}:{key}",
            "frequency": "monthly",
            "channel": channel,
            "level": level,
            "key": key,
            "period_start": start,
            "period_end": end,
            "split": part,
            "recorded_days": int(end.day),
            "units": int(value),
            "amount": float(value) * UNIT_PRICE,
            "lines": int(value),
        }
        for start, end, part, value in zip(months, ends, split, units, strict=True)
    ]


def synthetic_panel(seed: int = SEED) -> pd.DataFrame:
    """Monthly panel of the fictitious store: SKUs add up to categories and to the total."""
    rng = np.random.default_rng(seed)
    months = pd.date_range(FIRST_MONTH, periods=MONTHS, freq="MS")
    rows: list[dict[str, Any]] = []
    by_category = {key: np.zeros(MONTHS, dtype=np.int64) for key in CATEGORIES}
    for sku_id, _, category, rate in SKUS:
        units = rng.poisson(rate * 4, MONTHS) * rng.binomial(1, min(rate + 0.2, 1.0), MONTHS)
        by_category[category] += units
        rows += _rows("sku", sku_id, "total", units, months)
    for key, units in by_category.items():
        rows += _rows("category", key, "total", units, months)
    total = sum(by_category.values(), np.zeros(MONTHS, dtype=np.int64))
    vecinos = np.round(total * VECINOS_SHARE).astype(np.int64)
    rows += _rows("total", "ALL", "total", total, months)
    rows += _rows("total", "ALL", "vecinos", vecinos, months)
    rows += _rows("total", "ALL", "facturado", total - vecinos, months)
    return pd.DataFrame(rows, columns=list(PANEL_COLUMNS))


def _profile(panel: pd.DataFrame) -> pd.DataFrame:
    rows = panel[panel["channel"] == "total"].assign(sold=lambda f: f["units"] > 0)
    grouped = rows.groupby(["series_id", "frequency", "channel", "level", "key"])
    profile = pd.DataFrame(
        {
            "units": grouped["units"].sum(),
            "periods": grouped.size(),
            "periods_with_sales": grouped["sold"].sum(),
        }
    ).reset_index()
    zero_share = 1 - profile["periods_with_sales"] / profile["periods"]
    profile["pattern"] = np.where(zero_share > INTERMITTENT_ZERO_SHARE, "intermittent", "smooth")
    profile["selected"] = True
    return profile


def _research_snapshot() -> dict[str, Any]:
    accuracy = [
        {
            "level": level,
            "model": model,
            "label": label,
            "series": series,
            "medianMase": mase,
            "medianRmsse": round(mase * 0.9, 3),
            "meanRank": rank,
            "shareBeatsNaive": share,
        }
        for level, series in (("total", 1), ("category", 3))
        for model, label, mase, rank, share in (
            ("naive", "Ingenuo", 1.0, 2.0, 0.0),
            ("ses", "SES", 0.9, 1.0, 1.0),
        )
    ]
    inventory = [
        {
            "level": "category",
            "model": model,
            "label": label,
            "fillRate": fill,
            "meanOnHand": 3.0,
            "lostUnits": 1.0,
            "lostValue": 100.0,
        }
        for model, label, fill in (("naive", "Ingenuo", 0.9), ("ses", "SES", 0.95))
    ]
    return {
        "accuracy": {"runId": "synthetic", "origins": 6, "testWindow": None, "rows": accuracy},
        "inventory": {
            "runId": "synthetic",
            "leadTime": 1,
            "fillRateTarget": 0.95,
            "rows": inventory,
        },
    }


def write_synthetic_project(root: Path, seed: int = SEED) -> Path:
    """Write the fictitious store under ``root`` and return its served series folder."""
    series = root / "data" / "service" / "03_series"
    (series / "sealed").mkdir(parents=True, exist_ok=True)
    panel = synthetic_panel(seed)
    is_sealed = panel["split"] == "test"
    panel[~is_sealed].to_parquet(series / "panel_development.parquet", index=False)
    panel[is_sealed].to_parquet(series / "sealed" / "panel_sealed.parquet", index=False)
    pd.DataFrame([{"sku_id": s, "sku_name": n, "category": c} for s, n, c, _ in SKUS]).to_parquet(
        series / "catalog_skus.parquet", index=False
    )
    (series / "category_labels.json").write_text(
        json.dumps(CATEGORIES, ensure_ascii=False), encoding="utf-8"
    )
    last = panel["period_end"].max().strftime("%Y-%m-%d")
    (series / "manifest.json").write_text(
        json.dumps({"step": "synthetic", "details": {"windows": {"record_end": last}}}),
        encoding="utf-8",
    )
    _profile(panel).to_parquet(series / PROFILE_FILE, index=False)
    (series / SNAPSHOT_FILE).write_text(json.dumps(_research_snapshot()), encoding="utf-8")
    freeze = root / FREEZE_DOC
    freeze.parent.mkdir(parents=True, exist_ok=True)
    freeze.write_text(
        json.dumps({"tag": "synthetic-freeze", "frozen_at": "2026-01-01T00:00:00+00:00"}),
        encoding="utf-8",
    )
    return series


if __name__ == "__main__":  # pragma: no cover
    if len(sys.argv) != 2:  # noqa: PLR2004
        sys.exit("Uso: python -m pcsforecast.service.synthetic <carpeta-destino>")
    print(write_synthetic_project(Path(sys.argv[1]).resolve()))
