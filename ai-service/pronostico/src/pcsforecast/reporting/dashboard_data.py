"""Read-only access to pipeline outputs for the dashboard.

Only the development panel is read: the sealed final-test span is never loaded here.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from pcsforecast.paths import ProjectPaths

RUN_RECORD = "run.json"
METRICS_FILE = "metrics.parquet"
SIMULATION_FILE = "simulation.parquet"
AUDIT_REPORT = "audit_report.json"


@dataclass(frozen=True)
class Run:
    run_id: str
    record: dict[str, Any]
    metrics: pd.DataFrame


@dataclass(frozen=True)
class InventoryRun:
    run_id: str
    record: dict[str, Any]
    simulation: pd.DataFrame


@dataclass(frozen=True)
class RetailData:
    """Aggregates of the audited retail receipts (no customer appears here)."""

    audit: dict[str, Any]
    monthly: pd.DataFrame
    coverage: pd.DataFrame


@dataclass(frozen=True)
class StatsRun:
    """Tables of the latest F7 comparison of one frequency."""

    run_id: str
    record: dict[str, Any]
    tables: dict[str, pd.DataFrame]


@dataclass(frozen=True)
class DashboardData:
    audit: dict[str, Any]
    windows: dict[str, str]
    panel: pd.DataFrame
    profile: pd.DataFrame
    skus: pd.DataFrame
    category_labels: dict[str, str]
    runs: dict[str, Run]
    inventory: dict[str, InventoryRun]
    retail: RetailData | None = None
    stats: dict[str, StatsRun] = field(default_factory=dict)


def _json(path: Path) -> dict[str, Any]:
    data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return data


def _latest_by_frequency[T](
    runs_dir: Path, data_file: str, build: Callable[[str, dict[str, Any], pd.DataFrame], T]
) -> dict[str, T]:
    """Most recent complete run per frequency among runs that contain ``data_file``."""
    latest: dict[str, T] = {}
    if not runs_dir.is_dir():
        return latest
    for directory in sorted(runs_dir.iterdir()):
        if not all((directory / name).is_file() for name in (RUN_RECORD, data_file)):
            continue
        record = _json(directory / RUN_RECORD)
        if record.get("condition", "full") != "full":  # HE3 contrasts are not the main runs
            continue
        frame = pd.read_parquet(directory / data_file)
        latest[str(record["frequency"])] = build(directory.name, record, frame)
    return latest


def latest_runs(runs_dir: Path) -> dict[str, Run]:
    """Most recent complete validation run per frequency."""
    return _latest_by_frequency(runs_dir, METRICS_FILE, Run)


def latest_inventory(runs_dir: Path) -> dict[str, InventoryRun]:
    """Most recent complete inventory simulation per frequency."""
    return _latest_by_frequency(runs_dir, SIMULATION_FILE, InventoryRun)


def service_inventory(simulation: pd.DataFrame, lead_time: int, target: float) -> pd.DataFrame:
    """Per level and model: aggregate fill rate, mean stock, lost sales and calibration outcome."""
    chosen = simulation[
        (simulation["lead_time"] == lead_time) & (simulation["fill_rate_target"] == target)
    ]
    table = chosen.groupby(["level", "model"]).agg(
        series=("series_id", "nunique"),
        demand=("demand", "sum"),
        served=("served", "sum"),
        lost_units=("lost_units", "sum"),
        lost_value=("lost_value", "sum"),
        mean_on_hand=("mean_on_hand", "mean"),
        mean_safety_stock=("mean_safety_stock", "mean"),
        target_reached=("target_reached", "mean"),
        median_multiplier=("multiplier", "median"),
    )
    if "lost_value_list_fill" in chosen:
        # Runs before the price-list links have no list valuation.
        listed = chosen.groupby(["level", "model"])["lost_value_list_fill"].sum()
        table["lost_value_list_fill"] = listed
    table["fill_rate"] = table["served"] / table["demand"].where(table["demand"] > 0)
    return table.reset_index().sort_values(["level", "fill_rate"], ascending=[True, False])


def retail_monthly(lines: pd.DataFrame) -> pd.DataFrame:
    """Receipts, units and net sales per month and receipt kind."""
    frame = lines.assign(month=lines["issue_date"].dt.to_period("M").astype(str))
    table = frame.groupby(["month", "doc_kind"]).agg(
        receipts=("receipt_key", "nunique"),
        units=("quantity", "sum"),
        net_sales=("net_amount", "sum"),
    )
    return table.reset_index()


def load_retail_data(paths: ProjectPaths) -> RetailData | None:
    clean = paths.clean / "retail"
    if not (clean / AUDIT_REPORT).is_file():
        return None
    return RetailData(
        audit=_json(clean / AUDIT_REPORT),
        monthly=retail_monthly(pd.read_parquet(clean / "retail_lines.parquet")),
        coverage=pd.read_parquet(clean / "coverage_by_month.parquet"),
    )


def latest_stats(stats_dir: Path) -> dict[str, StatsRun]:
    """Most recent F7 comparison per frequency."""
    latest: dict[str, StatsRun] = {}
    if not stats_dir.is_dir():
        return latest
    for directory in sorted(stats_dir.iterdir()):
        record_path = directory / "stats.json"
        if not record_path.is_file():
            continue
        record = _json(record_path)
        tables = {path.stem: pd.read_parquet(path) for path in sorted(directory.glob("*.parquet"))}
        latest[str(record["frequency"])] = StatsRun(directory.name, record, tables)
    return latest


def friedman_summary(table: pd.DataFrame, channel: str) -> pd.DataFrame:
    """Friedman rows of one channel with the best and worst model by mean rank."""
    rows = table[table["channel"] == channel].copy()
    if rows.empty:
        return rows
    ranks = rows["mean_ranks"].map(json.loads)
    rows["best_model"] = ranks.map(lambda r: min(r, key=r.get))
    rows["worst_model"] = ranks.map(lambda r: max(r, key=r.get))
    columns = ["level", "horizon", "series", "statistic", "p_value", "critical_difference"]
    return rows[[*columns, "best_model", "worst_model"]].reset_index(drop=True)


def load_dashboard_data(paths: ProjectPaths) -> DashboardData:
    series = paths.series
    return DashboardData(
        audit=_json(paths.clean / AUDIT_REPORT),
        windows=_json(series / "manifest.json")["details"]["windows"],
        panel=pd.read_parquet(series / "panel_development.parquet"),
        profile=pd.read_parquet(series / "profile.parquet"),
        skus=pd.read_parquet(series / "catalog_skus.parquet"),
        category_labels=_json(series / "category_labels.json"),
        runs=latest_runs(paths.runs),
        inventory=latest_inventory(paths.runs),
        retail=load_retail_data(paths),
        stats=latest_stats(paths.runs.parent / "stats"),
    )


def leaderboard(metrics: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """Per level and model: series evaluated, median MASE/RMSSE, mean rank and wins over naive.

    Ranks are computed within each series (1 = lowest MASE) so that every model is compared on
    the same series; series whose MASE is undefined for some model are left out of the ranks.
    """
    frame = metrics[metrics["horizon"] == horizon]
    ranked = frame.dropna(subset=["mase"]).copy()
    complete = (
        ranked.groupby("series_id")["model"].transform("nunique") == ranked["model"].nunique()
    )
    ranked = ranked[complete]
    ranked["rank"] = ranked.groupby("series_id")["mase"].rank(method="average")
    ranks = ranked.groupby(["level", "model"])["rank"].mean().rename("mean_rank")
    beats = (
        frame.assign(beats_naive=frame["rel_mae"] < 1.0)
        .groupby(["level", "model"])["beats_naive"]
        .mean()
        .rename("share_beats_naive")
    )
    summary = frame.groupby(["level", "model"]).agg(
        series=("series_id", "nunique"),
        median_mase=("mase", "median"),
        median_rmsse=("rmsse", "median"),
        mean_bias=("bias", "mean"),
    )
    table = summary.join(ranks).join(beats).reset_index()
    return table.sort_values(["level", "mean_rank"]).reset_index(drop=True)


def monthly_counts(audit: dict[str, Any]) -> pd.DataFrame:
    """Valid lines and units per month from the audit report."""
    currentness = audit["currentness"]
    lines = pd.Series(currentness["valid_lines_by_month"], name="lines")
    units = pd.Series(currentness["valid_units_by_month"], name="units")
    frame = pd.concat([lines, units], axis=1).fillna(0).astype(int)
    frame.index.name = "month"
    return frame.reset_index()


CHANNEL_ORDER = ("total", "vecinos", "facturado", "total_dedup")
# Series built before the protocol amendment v3 came from the vecinos record only.
LEGACY_CHANNEL = "vecinos"


def with_channel(frame: pd.DataFrame) -> pd.DataFrame:
    """``frame`` with a ``channel`` column (runs made before amendment v3 have none)."""
    return frame if "channel" in frame else frame.assign(channel=LEGACY_CHANNEL)


def channel_options(frame: pd.DataFrame) -> list[str]:
    """Channels present in ``frame``, primary first."""
    present = set(with_channel(frame)["channel"])
    return [c for c in CHANNEL_ORDER if c in present]


def series_options(
    profile: pd.DataFrame, frequency: str, level: str, channel: str | None = None
) -> list[str]:
    """Selected series of one frequency, level and channel, largest first."""
    profile = with_channel(profile)
    chosen = profile[
        (profile["frequency"] == frequency)
        & (profile["level"] == level)
        & profile["selected"]
        & ((profile["channel"] == channel) if channel is not None else True)
    ]
    return chosen.sort_values(["units", "key"], ascending=[False, True])["key"].tolist()


def channel_volumes(panel: pd.DataFrame) -> pd.DataFrame:
    """Monthly development units of each source (vecinos record, receipts)."""
    panel = with_channel(panel)
    chosen = panel[
        (panel["frequency"] == "monthly")
        & (panel["level"] == "total")
        & panel["channel"].isin(["vecinos", "facturado"])
    ]
    return chosen[["period_start", "channel", "units"]].reset_index(drop=True)
