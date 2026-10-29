"""F2 pipeline step: catalog, calendars, panels (development and sealed) and profiles."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pcsforecast.catalog.build import build_catalog, category_labels
from pcsforecast.config import CatalogConfig, ProtocolConfig, SeriesConfig
from pcsforecast.manifest import StepManifest, verify_outputs
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.windows import Windows, final_test_windows
from pcsforecast.series.build import (
    CHANNEL_DEDUP,
    CHANNEL_FACTURADO,
    build_panel,
    calendar,
    channel_days,
    channel_demand,
    demand_lines,
    possible_duplicates,
    receipt_days,
    receipt_demand,
    receipt_texts,
    recorded_days,
)
from pcsforecast.series.profile import demand_structure, profile_panel, select_skus

SEALED_DIR = "sealed"
DEVELOPMENT_PANEL = "panel_development.parquet"
SEALED_PANEL = "panel_sealed.parquet"
FREQUENCIES = ("weekly", "monthly")
RETAIL_LINES = Path("retail") / "retail_lines.parquet"
RECEIPT_CHANNELS = (CHANNEL_FACTURADO, CHANNEL_DEDUP)


class SeriesInputError(RuntimeError):
    """The clean data differ from what the audit step handed over."""


def _windows(lines: pd.DataFrame, sheet_dates: pd.DataFrame, protocol: ProtocolConfig) -> Windows:
    dated = sheet_dates[sheet_dates["sheet_index"].isin(lines["sheet_index"])]
    record_start = dated["date_start"].min().date()
    record_end = protocol.final_test.record_end or dated["date_end"].max().date()
    return final_test_windows(record_start, record_end, protocol.final_test.last_complete_months)


def _retail_lines(paths: ProjectPaths) -> pd.DataFrame | None:
    """Audited retail items, or ``None`` when the receipts have not been audited."""
    path = paths.clean / RETAIL_LINES
    if not path.is_file():
        return None
    changed = verify_outputs(path.parent, paths.root)
    if changed:
        raise SeriesInputError(f"retail files differ from the receipt audit manifest: {changed}")
    return pd.read_parquet(path)


def run_series(
    paths: ProjectPaths,
    catalog_config: CatalogConfig,
    series_config: SeriesConfig,
    protocol: ProtocolConfig,
) -> Path:
    """Build ``data/03_series`` from the audited vecinos lines and retail receipts."""
    changed = verify_outputs(paths.clean, paths.root)
    if changed:
        raise SeriesInputError(f"clean files differ from the audit manifest: {changed}")
    lines = pd.read_parquet(paths.clean / "vecinos_lines.parquet")
    sheet_dates = pd.read_parquet(paths.clean / "vecinos_sheet_dates.parquet")
    retail = _retail_lines(paths)
    valid = lines[lines["status"] == "valid"]

    demand_mask = valid["movement_type"].isin(series_config.demand_movements)
    catalog_input = valid[demand_mask]
    if retail is not None:
        catalog_input = pd.concat([catalog_input, receipt_texts(retail)], ignore_index=True)
    catalog = build_catalog(catalog_input, catalog_config)
    vecinos = demand_lines(
        valid, catalog.texts, series_config.demand_movements, series_config.date_confidences
    )
    receipts = (
        receipt_demand(retail, catalog.texts, series_config.receipt_tax_rate)
        if retail is not None
        else vecinos.iloc[0:0]
    )
    duplicate = possible_duplicates(vecinos, receipts, series_config.duplicate_window_days)
    channels = [
        c for c in series_config.channels if retail is not None or c not in RECEIPT_CHANNELS
    ]
    windows = _windows(valid, sheet_dates, protocol)
    vecinos_days = recorded_days(sheet_dates, valid["sheet_index"].unique())
    receipts_days = receipt_days(receipts)
    total = channel_demand(vecinos, receipts, duplicate, "total")
    selected = select_skus(total, windows.test_start, series_config.sku_volume_share)

    out = paths.series
    manifest = StepManifest(step="build_series", root=paths.root)
    for name in ("vecinos_lines.parquet", "vecinos_sheet_dates.parquet"):
        manifest.add_input(paths.clean / name)
    if retail is not None:
        manifest.add_input(paths.clean / RETAIL_LINES)
    for config in ("catalog.yaml", "series.yaml", "protocol.yaml"):
        manifest.add_input(paths.configs / config)
    manifest.write_parquet(catalog.texts, out / "catalog_texts.parquet")
    manifest.write_parquet(catalog.skus, out / "catalog_skus.parquet")

    study_start = pd.Timestamp(protocol.study_period.start)
    calendars, panels, profiles = [], [], []
    for channel in channels:
        demand = channel_demand(vecinos, receipts, duplicate, channel)
        days = channel_days(vecinos_days, receipts_days, channel)
        for frequency in FREQUENCIES:
            periods = calendar(study_start, windows, frequency, days, channel)
            panel = build_panel(demand, periods)
            calendars.append(periods)
            panels.append(panel)
            profiles.append(
                profile_panel(
                    panel,
                    selected,
                    series_config.adi_cutoff,
                    series_config.cv2_cutoff,
                    demand_structure(demand, windows.test_start),
                )
            )
    panel = pd.concat(panels, ignore_index=True)
    manifest.write_parquet(pd.concat(calendars, ignore_index=True), out / "calendar.parquet")
    manifest.write_parquet(panel[panel["split"] == "development"], out / DEVELOPMENT_PANEL)
    manifest.write_parquet(panel[panel["split"] != "development"], out / SEALED_DIR / SEALED_PANEL)
    manifest.write_parquet(pd.concat(profiles, ignore_index=True), out / "profile.parquet")
    labels = out / "category_labels.json"
    labels.write_text(
        json.dumps(category_labels(catalog_config), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    manifest.add_output(labels)

    manifest.details = {
        "windows": windows.as_dict(),
        "channels": channels,
        "structural_break": (
            protocol.structural_break.isoformat() if protocol.structural_break else None
        ),
        "demand_lines": {"vecinos": len(vecinos), "receipts": len(receipts)},
        "demand_units": {
            "vecinos": int(vecinos["quantity"].sum()),
            "receipts": float(receipts["quantity"].sum()),
        },
        "receipt_lines_possibly_duplicated": int(duplicate.sum()),
        "skus": len(catalog.skus),
        "selected_skus": len(selected),
        "sku_volume_share": series_config.sku_volume_share,
    }
    return manifest.write(out)
