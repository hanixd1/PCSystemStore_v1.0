"""Monthly demand histories served to the web page.

The final test span was opened once (F9), so production forecasts use the whole recorded
history: the development panel plus the formerly sealed panel. Only the ``total`` channel
(vecinos record + delivered receipts) at monthly frequency is served; SKU names come from the
catalog, customers never appear here.

The series come from ``data/service/03_series`` (the owner-corrected data, see its README) or the
folder in ``PCS_SERVICE_SERIES``; the frozen research panels in ``data/03_series`` are only a
fallback and are never modified.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pcsforecast.models.base import FloatArray
from pcsforecast.paths import ProjectPaths

FREQUENCY = "monthly"
CHANNEL = "total"
SOURCE_CHANNELS = ("vecinos", "facturado")
TOTAL_KEY = "ALL"
SERVICE_SERIES_ENV = "PCS_SERVICE_SERIES"
# Rolling window of the frozen monthly protocol (protocol.yaml): models see the last 18 months.
CONTEXT_MONTHS = 18
WEB_PANEL_FILE = Path("web") / "panel_web.parquet"


@dataclass(frozen=True)
class SeriesStore:
    """Monthly histories of one channel, one row per series and month."""

    panel: pd.DataFrame
    sku_names: dict[str, str]
    sku_categories: dict[str, str]
    category_labels: dict[str, str]
    record_end: str | None
    source: Path

    @cached_property
    def months(self) -> list[pd.Timestamp]:
        """Months of the forecast channel (a source channel such as ``web`` may run ahead)."""
        served = self.panel.loc[self.panel["channel"] == CHANNEL, "period_start"]
        return sorted(pd.Timestamp(m) for m in served.unique())

    @property
    def last_month(self) -> pd.Timestamp:
        return self.months[-1]

    @property
    def first_month(self) -> pd.Timestamp:
        return self.months[0]

    def _frame(self, level: str, channel: str = CHANNEL) -> pd.DataFrame:
        rows = self.panel[(self.panel["level"] == level) & (self.panel["channel"] == channel)]
        return rows.sort_values("period_start")

    def history(self, level: str, key: str, channel: str = CHANNEL) -> pd.DataFrame:
        rows = self._frame(level, channel)
        return rows[rows["key"] == key][["period_start", "units", "amount", "recorded_days"]]

    def histories(self, level: str, context: int | None = CONTEXT_MONTHS) -> dict[str, FloatArray]:
        """Units per series of ``level``, the last ``context`` months (``None``: all)."""
        frame = self._frame(level)
        result: dict[str, FloatArray] = {}
        for key, group in frame.groupby("key", sort=True):
            values = group["units"].to_numpy(dtype=np.float64)
            result[str(key)] = values if context is None else values[-context:]
        return result

    def total(self) -> FloatArray:
        return self.histories("total", context=None)[TOTAL_KEY]

    def sources(self) -> pd.DataFrame:
        """Monthly units of each source channel at the total level."""
        rows = self.panel[
            (self.panel["level"] == "total") & self.panel["channel"].isin(SOURCE_CHANNELS)
        ]
        return rows[["period_start", "channel", "units", "recorded_days"]]

    def category_label(self, key: str) -> str:
        return self.category_labels.get(key, key)


def _json(path: Path) -> dict[str, object]:
    data: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    return data


def service_series_dir(paths: ProjectPaths) -> Path:
    """Folder of the series served in production (see the module docstring)."""
    configured = os.environ.get(SERVICE_SERIES_ENV)
    if configured:
        return Path(configured).resolve()
    corrected = paths.data / "service" / "03_series"
    return corrected if (corrected / "panel_development.parquet").is_file() else paths.series


# Columns the service reads. The panels also hold weekly rows and other channels (~4x more rows):
# reading them whole cost ~500 MB of RAM in the ai-service for data it never uses.
SERVED_COLUMNS = [
    "series_id",
    "frequency",
    "channel",
    "level",
    "key",
    "period_start",
    "units",
    "amount",
    "recorded_days",
]
# Monthly rows of the forecast channel (every level), plus the per-source totals (sources()).
SERVED_ROWS: list[list[tuple[str, str, Any]]] = [
    [("frequency", "==", FREQUENCY), ("channel", "==", CHANNEL)],
    [
        ("frequency", "==", FREQUENCY),
        ("level", "==", "total"),
        ("channel", "in", [*SOURCE_CHANNELS, "web"]),
    ],
]


def read_served_panel(path: Path) -> pd.DataFrame:
    """Only the served rows and columns, filtered by pyarrow before pandas sees them."""
    return pd.read_parquet(path, columns=SERVED_COLUMNS, filters=SERVED_ROWS)


def load_series(paths: ProjectPaths, include_web: bool = True) -> SeriesStore:
    """Development and opened test panels of the monthly frequency, served channels only."""
    series = service_series_dir(paths)
    frames = [read_served_panel(series / "panel_development.parquet")]
    # Web-store months (pcsforecast.service.web_sales) are read last so they take precedence.
    extras = [series / "sealed" / "panel_sealed.parquet"]
    if include_web:
        extras.append(series / WEB_PANEL_FILE)
    for extra in extras:
        if extra.is_file():
            frames.append(read_served_panel(extra))
    panel = pd.concat(frames, ignore_index=True)
    panel = panel[panel["frequency"] == FREQUENCY].drop_duplicates(
        subset=["series_id", "period_start"], keep="last"
    )
    skus = pd.read_parquet(series / "catalog_skus.parquet")
    manifest = series / "manifest.json"
    details = _json(manifest).get("details", {}) if manifest.is_file() else {}
    windows = details.get("windows", {}) if isinstance(details, dict) else {}
    record_end = windows.get("record_end") if isinstance(windows, dict) else None
    return SeriesStore(
        panel=panel.reset_index(drop=True),
        sku_names=dict(zip(skus["sku_id"], skus["sku_name"], strict=True)),
        sku_categories=dict(zip(skus["sku_id"], skus["category"], strict=True)),
        category_labels={str(k): str(v) for k, v in _json(series / "category_labels.json").items()},
        record_end=None if record_end is None else str(record_end),
        source=series,
    )
