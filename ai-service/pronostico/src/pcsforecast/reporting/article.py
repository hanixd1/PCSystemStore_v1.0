"""Evidence tables for the article (plan 2.5.2, amendment v4), built from the recorded artifacts.

Four groups, in the order a reviewer checks them:

1. Data governance: rows read, rows excluded by each deterministic rule, accounting
   reconciliation of the vecinos sheets and of the fiscal receipts, catalog and series.
2. Temporal split: rolling-origin protocol per frequency, contrasts and the sealed test window.
3. Computational reproducibility: versions, hardware, seeds, pinned weights, configuration
   hashes and the effective hyperparameters of every model.
4. Statistical rigour: MASE summaries, Friedman/Nemenyi, Diebold-Mariano, the inventory
   simulation (service, stock, safety stock, lost sales), Spearman and the HE3 robustness tests.

Nothing is typed by hand: every number comes from an audit report, a manifest, a run record or a
statistics table, so the tables can be rebuilt after the final test exactly as before it
(``stage="test"`` reads the final-test runs; the governance tables do not change).
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pcsforecast.config import CONFIG_FILES, file_sha256
from pcsforecast.manifest import read_manifest
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.stages import Stage
from pcsforecast.reporting.markdown import markdown_table
from pcsforecast.stats.run import RUN_RECORD, StatsInputError, latest_run, stats_name

FREQUENCIES = ("weekly", "monthly")
CHANNEL = "total"
AUDIT_REPORT = "audit_report.json"
SPANS = {
    "development": "development span",
    "rehearsal": "rehearsal of the final test",
    "test": "final test",
}
Table = tuple[str, pd.DataFrame]


class ArticleInputError(RuntimeError):
    """An artifact the tables need is missing."""


def _json(path: Path) -> dict[str, object]:
    if not path.is_file():
        raise ArticleInputError(f"missing {path}")
    data: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    return data


def _section(data: Mapping[str, object], name: str) -> dict[str, object]:
    value = data.get(name, {})
    return dict(value) if isinstance(value, Mapping) else {}


# --- 1. data governance -------------------------------------------------------------------------


def governance_tables(paths: ProjectPaths) -> list[Table]:
    vecinos = _json(paths.clean / AUDIT_REPORT)
    retail_path = paths.clean / "retail" / AUDIT_REPORT
    retail = _json(retail_path) if retail_path.is_file() else {}
    completeness = _section(vecinos, "completeness")
    excluded = dict(_section(completeness, "excluded_by_rule"))
    rows: list[dict[str, object]] = [
        {"step": "Daily sheets read", "count": completeness.get("sheets_total")},
        {"step": "Rows read", "count": completeness.get("staged_rows")},
    ]
    rows += [
        {"step": f"Excluded by rule {rule}", "count": n} for rule, n in sorted(excluded.items())
    ]
    rows += [
        {"step": "Valid lines", "count": completeness.get("valid_lines")},
        {"step": "Valid units", "count": completeness.get("valid_units")},
        {
            "step": "Valid lines without amount",
            "count": completeness.get("valid_lines_without_amount"),
        },
    ]
    blocks = dict(_section(_section(vecinos, "consistency"), "reconciliation"))
    rows += [
        {"step": f"Daily blocks: {k.replace('_', ' ')}", "count": v} for k, v in blocks.items()
    ]

    retail_completeness = _section(retail, "completeness")
    retail_consistency = _section(retail, "consistency")
    receipts = pd.DataFrame(
        [
            {"measure": "Receipt files", "value": retail_completeness.get("receipt_files")},
            {"measure": "Valid receipts", "value": retail_completeness.get("valid_receipts")},
            {"measure": "Item lines", "value": retail_completeness.get("item_lines")},
            {
                "measure": "Receipts reproducing their printed total",
                "value": retail_consistency.get("receipts_reconciled_within_tolerance"),
            },
            {
                "measure": "Largest reconciliation gap (S/)",
                "value": retail_consistency.get("max_abs_reconciliation_gap"),
            },
            {
                "measure": "Delivered share of the numbering",
                "value": _section(retail, "numbering").get("delivered_share_overall"),
            },
        ]
    )
    details = _section(read_manifest(paths.series), "details")
    profile = pd.read_parquet(paths.series / "profile.parquet")
    selected = profile[profile["selected"]]
    series = (
        selected.groupby(["frequency", "channel", "level"]).size().rename("series").reset_index()
    )
    catalog = pd.DataFrame(
        [
            {"measure": "SKUs in the catalog", "value": details.get("skus")},
            {"measure": "SKUs in the panel", "value": details.get("selected_skus")},
            {
                "measure": "Panel share of development units",
                "value": details.get("sku_volume_share"),
            },
            {"measure": "Structural break", "value": details.get("structural_break")},
            {
                "measure": "Receipt lines possibly also in the vecinos record",
                "value": details.get("receipt_lines_possibly_duplicated"),
            },
        ]
    )
    tables: list[Table] = [
        (
            "Table A1. Vecinos sales record: rows, deterministic exclusions and reconciliation",
            pd.DataFrame(rows),
        )
    ]
    if retail:  # fiscal receipts delivered (F1b)
        tables.append(
            ("Table A2. Fiscal receipts: reconciliation with the printed totals", receipts)
        )
    tables += [
        ("Table A3. Catalog and panel", catalog),
        ("Table A4. Series evaluated per frequency, channel and level", series),
    ]
    return tables


# --- 2. temporal split --------------------------------------------------------------------------


def _run_record(
    paths: ProjectPaths, frequency: str, condition: str = "full", stage: Stage = "development"
) -> dict[str, object]:
    return _json(latest_run(paths.runs, frequency, "validation", condition, stage) / RUN_RECORD)


def _evaluated_origins(paths: ProjectPaths, frequency: str, stage: Stage) -> dict[str, object]:
    """Origins of the final test (or its rehearsal) and whether the test span was used."""
    run_dir = latest_run(paths.runs, frequency, "validation", stage=stage)
    record = _json(run_dir / RUN_RECORD)
    predictions = pd.read_parquet(run_dir / "predictions.parquet", columns=["target_period"])
    window = _section(record, "test_window")
    return {
        f"{stage} window": f"{window.get('test_start')} to {window.get('test_end')}",
        f"{stage} origins": record.get("origins"),
        f"first {stage} target": str(predictions["target_period"].min().date()),
        f"last {stage} target": str(predictions["target_period"].max().date()),
        "test span used": record.get("test_span_used"),
    }


def split_table(paths: ProjectPaths, stage: Stage = "development") -> Table:
    windows = _section(_section(read_manifest(paths.series), "details"), "windows")
    rows = []
    for frequency in FREQUENCIES:
        run_dir = latest_run(paths.runs, frequency, "validation")
        record = _json(run_dir / RUN_RECORD)
        origins = pd.read_parquet(run_dir / "predictions.parquet", columns=["origin"])["origin"]
        window = _section(record, "window")
        contrasts = []
        for condition in ("truncated", "expanding"):
            try:
                other = _section(_run_record(paths, frequency, condition), "window")
            except StatsInputError:
                continue
            shape = (
                "all history"
                if other.get("primary") == "expanding"
                else f"{other.get('primary')}, {other.get('length')}"
            )
            contrasts.append(f"{condition} ({shape})")
        rows.append(
            {
                "frequency": frequency,
                "record": f"{windows.get('record_start')} to {windows.get('record_end')}",
                "sealed test": f"{windows.get('test_start')} to {windows.get('test_end')}",
                "minimum training": record.get("min_train_periods"),
                "window": f"{window.get('primary')}, {window.get('length')}",
                "contrasts": "; ".join(contrasts) or "none",
                "horizons": record.get("horizons"),
                "sensitivity horizons": record.get("sensitivity_horizons") or "none",
                "origins": record.get("origins"),
                "first origin": str(origins.min().date()),
                "last origin": str(origins.max().date()),
                "test span used": record.get("test_span_used"),
            }
            | ({} if stage == "development" else _evaluated_origins(paths, frequency, stage))
        )
    return ("Table B1. Rolling-origin evaluation and sealed test span", pd.DataFrame(rows))


# --- 3. reproducibility -------------------------------------------------------------------------


def _number(value: object) -> str:
    """Parameters as written in the configuration: integers without decimals (seeds, rounds)."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return f"{value:g}" if isinstance(value, float) else str(value)


def _memory(peak: object) -> str:
    if not isinstance(peak, Mapping):
        return "not recorded"
    return f"{peak.get('self')} (main process), {peak.get('children')} (Chronos worker)"


def reproducibility_tables(paths: ProjectPaths, stage: Stage = "development") -> list[Table]:
    record = _run_record(paths, "weekly", stage=stage)
    environment = _section(record, "environment")
    packages = _section(environment, "packages")
    software = [{"item": "Python", "value": environment.get("python")}]
    software += [{"item": name, "value": version} for name, version in packages.items() if version]
    software += [
        {"item": "Machine", "value": f"{environment.get('system')} {environment.get('machine')}"},
        {"item": "CPU cores", "value": environment.get("cpu_count")},
        {"item": "Memory (GB)", "value": environment.get("memory_total_gb")},
        {"item": "Peak memory of the run (MB)", "value": _memory(record.get("peak_memory_mb"))},
    ]
    for name, pin in _section(record, "pretrained").items():
        if isinstance(pin, Mapping):
            software.append(
                {"item": f"{name} weights", "value": f"{pin.get('repo')}@{pin.get('revision')}"}
            )
    configs = [
        {"file": name, "sha256": file_sha256(paths.configs / name)[:16]}
        for name in CONFIG_FILES
        if (paths.configs / name).is_file()
    ]
    params = []
    for frequency in FREQUENCIES:
        effective = _section(_run_record(paths, frequency, stage=stage), "params")
        for model, values in effective.items():
            pairs = sorted(values.items()) if isinstance(values, Mapping) else []
            shown = ", ".join(f"{k} = {_number(v)}" for k, v in pairs)
            params.append({"frequency": frequency, "model": model, "parameters": shown or "none"})
    return [
        ("Table C1. Software, hardware and pinned pretrained weights", pd.DataFrame(software)),
        ("Table C2. Configuration files (SHA-256 prefix)", pd.DataFrame(configs)),
        ("Table C3. Effective hyperparameters and seeds", pd.DataFrame(params)),
    ]


# --- 4. statistical rigour ----------------------------------------------------------------------


def _total(frame: pd.DataFrame) -> pd.DataFrame:
    return frame[frame["channel"] == CHANNEL] if "channel" in frame else frame


def _stats_dir(paths: ProjectPaths, frequency: str, stage: Stage = "development") -> Path:
    found = sorted((paths.runs.parent / "stats").glob(f"*-{stats_name(frequency, stage)}"))
    if not found:
        raise ArticleInputError(f"no statistics for {frequency} ({stage}): run pcs run-stats")
    return found[-1]


def statistics_tables(
    paths: ProjectPaths, frequency: str, stage: Stage = "development"
) -> list[Table]:
    run_dir = latest_run(paths.runs, frequency, "validation", stage=stage)
    metrics = _total(pd.read_parquet(run_dir / "metrics.parquet"))
    accuracy = (
        metrics.groupby(["horizon", "level", "model"])["mase"]
        .agg(["mean", "median", "count"])
        .reset_index()
        .rename(columns={"mean": "mean MASE", "median": "median MASE", "count": "series"})
    )
    stats = _stats_dir(paths, frequency, stage)
    friedman = _total(pd.read_parquet(stats / "he1_friedman.parquet")).drop(
        columns=["channel"], errors="ignore"
    )
    dm = _total(pd.read_parquet(stats / "he1_diebold_mariano.parquet")).drop(
        columns=["channel"], errors="ignore"
    )
    spearman = _total(pd.read_parquet(stats / "he2_spearman.parquet")).drop(
        columns=["channel"], errors="ignore"
    )
    robustness = _total(pd.read_parquet(stats / "he3_robustness.parquet"))
    robustness = robustness.reindex(  # empty when no HE3 condition applies
        columns=["condition", "level", "horizon", "statistic", "p_value", "series"]
    )
    inventory_dir = latest_run(paths.runs, frequency, "inventory", stage=stage)
    simulation = _total(pd.read_parquet(inventory_dir / "simulation.parquet"))
    service = (
        simulation[simulation["primary_scenario"]]
        .groupby(["level", "model"])
        .agg(
            fill_rate=("fill_rate", "mean"),
            mean_on_hand=("mean_on_hand", "mean"),
            mean_safety_stock=("mean_safety_stock", "mean"),
            lost_units=("lost_units", "sum"),
            lost_value=("lost_value", "sum"),
            target_reached=("target_reached", "mean"),
        )
        .reset_index()
    )
    title = frequency.capitalize()
    return [
        (f"Table D1 ({title}). MASE by horizon, level and model ({SPANS[stage]})", accuracy),
        (f"Table D2 ({title}). Friedman test and Nemenyi critical difference", friedman),
        (f"Table D3 ({title}). Diebold-Mariano tests per series (Holm-adjusted)", dm),
        (f"Table D4 ({title}). Inventory simulation, primary scenario", service),
        (f"Table D5 ({title}). Spearman between the MASE and fill-rate rankings", spearman),
        (
            f"Table D6 ({title}). HE3 robustness: break, truncated history, expanding window",
            robustness,
        ),
    ]


def render(tables: Iterable[Table], note: str) -> str:
    parts = ["# Evidence tables for the article", "", note, ""]
    for title, frame in tables:
        parts += [f"## {title}", "", markdown_table(frame, digits=4), ""]
    return "\n".join(parts)


def run_article_tables(paths: ProjectPaths, stage: Stage = "development") -> Path:
    """Write every table to ``outputs/article/<timestamp>/tables.md``."""
    tables: list[Table] = [*governance_tables(paths), split_table(paths, stage)]
    tables += reproducibility_tables(paths, stage)
    for frequency in FREQUENCIES:
        tables += statistics_tables(paths, frequency, stage)
    started = datetime.now(UTC)
    out = paths.root / "outputs" / "article" / f"{started:%Y%m%dT%H%M%SZ}"
    out.mkdir(parents=True, exist_ok=False)
    note = (
        f"Generated {started.isoformat(timespec='seconds')} by `pcs article-tables` from the audit "
        "reports, manifests, run records and statistics tables. Channel: total demand. Results "
        f"describe the {SPANS[stage]}."
    )
    (out / "tables.md").write_text(render(tables, note), encoding="utf-8")
    return out
