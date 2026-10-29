"""Tables for the thesis results chapter (chapter III), built from the recorded artifacts.

Three groups, in the order of the chapter:

1. Descriptive analysis: normality of the performance measures (Shapiro-Wilk), the demand of
   the development and test spans, the demand patterns, and the application of the models
   (time by stage, Chronos fine-tuning).
2. Hypotheses: a summary for HG, then HE1 (Friedman on MASE and RMSSE by channel, level and
   horizon; MASE by demand pattern), HE2 (service and stock by model, Friedman on fill rate,
   Spearman against the 0.5 threshold) and HE3 (robustness and the stability of the ranking
   between the development and the test origins).

Every number comes from a run record, a statistics table or the series panels. With
``stage="test"`` the sealed panel is read through ``load_evaluation``, so only after the freeze.
The normality tests are descriptive: they show why the plan uses rank-based tests (plan 2.6.6)
and do not change any test.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from pcsforecast.config import ProtocolConfig, StatsConfig, load_project_config
from pcsforecast.final_test.panel import load_evaluation
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.stages import Stage
from pcsforecast.reporting.article import SPANS, Table, render
from pcsforecast.stats.run import RUN_RECORD, latest_run, stats_name
from pcsforecast.stats.tests import friedman, mean_ranks

FREQUENCIES = ("weekly", "monthly")
CHANNEL = "total"
LEVELS = ("category", "sku")
SHAPIRO_MIN = 3
SHAPIRO_MAX = 5000
REJECT = "reject H0"


def _record(directory: Path) -> dict[str, object]:
    data: dict[str, object] = json.loads((directory / RUN_RECORD).read_text(encoding="utf-8"))
    return data


def _metrics(paths: ProjectPaths, frequency: str, stage: Stage) -> pd.DataFrame:
    return pd.read_parquet(
        latest_run(paths.runs, frequency, "validation", stage=stage) / "metrics.parquet"
    )


def _simulation(paths: ProjectPaths, frequency: str, stage: Stage) -> pd.DataFrame:
    return pd.read_parquet(
        latest_run(paths.runs, frequency, "inventory", stage=stage) / "simulation.parquet"
    )


def _stats(paths: ProjectPaths, frequency: str, stage: Stage, name: str) -> pd.DataFrame:
    found = sorted((paths.runs.parent / "stats").glob(f"*-{stats_name(frequency, stage)}"))
    if not found:
        raise FileNotFoundError(f"no statistics for {frequency} ({stage})")
    return pd.read_parquet(found[-1] / f"{name}.parquet")


def _best_worst(ranks: Mapping[str, float]) -> tuple[str, str]:
    ordered = sorted(ranks, key=lambda model: ranks[model])
    return ordered[0], ordered[-1]


# --- 1. descriptive analysis --------------------------------------------------------------------


def shapiro(values: pd.Series) -> tuple[float, float] | None:
    """Shapiro-Wilk statistic and p-value; ``None`` outside 3..5000 values or without spread."""
    clean = values.replace([np.inf, -np.inf], np.nan).dropna().to_numpy(dtype=float)
    if not SHAPIRO_MIN <= clean.size <= SHAPIRO_MAX or np.ptp(clean) == 0:
        return None
    result = stats.shapiro(clean)
    return float(result.statistic), float(result.pvalue)


def _shapiro_rows(
    frame: pd.DataFrame, column: str, alpha: float, labels: dict[str, str]
) -> list[dict[str, object]]:
    """One Shapiro-Wilk row per level and model with enough distinct values."""
    rows: list[dict[str, object]] = []
    for (level, model), group in frame[frame["level"].isin(LEVELS)].groupby(["level", "model"]):
        result = shapiro(group[column])
        if result is not None:
            rows.append(
                labels
                | {
                    "level": level,
                    "model": model,
                    "n": int(group[column].notna().sum()),
                    "W": result[0],
                    "p_value": result[1],
                    "normal": "yes" if result[1] >= alpha else "no",
                }
            )
    return rows


def normality_table(paths: ProjectPaths, stage: Stage, alpha: float) -> Table:
    """Shapiro-Wilk on MASE (first horizon) and fill rate (primary scenario), per model."""
    rows = []
    for frequency in FREQUENCIES:
        metrics = _metrics(paths, frequency, stage)
        metrics = metrics[(metrics["channel"] == CHANNEL) & (metrics["horizon"] == 1)]
        simulation = _simulation(paths, frequency, stage)
        simulation = simulation[(simulation["channel"] == CHANNEL) & simulation["primary_scenario"]]
        rows += _shapiro_rows(metrics, "mase", alpha, {"frequency": frequency, "measure": "MASE"})
        rows += _shapiro_rows(
            simulation, "fill_rate", alpha, {"frequency": frequency, "measure": "fill rate"}
        )
    return (
        "Table T1. Shapiro-Wilk normality test of MASE (h = 1) and fill rate",
        pd.DataFrame(rows),
    )


def _demand_summary(panel: pd.DataFrame, split: str) -> pd.DataFrame:
    rows = []
    chosen = panel[(panel["channel"] == CHANNEL) & (panel["split"] == split)]
    for (frequency, level), frame in chosen.groupby(["frequency", "level"]):
        per_series = frame.groupby("series_id")["units"]
        rows.append(
            {
                "span": split,
                "frequency": frequency,
                "level": level,
                "series": int(frame["series_id"].nunique()),
                "periods": int(frame["period_start"].nunique()),
                "units": float(frame["units"].sum()),
                "mean units per period": float(per_series.mean().mean()),
                "zero periods (share)": float((frame["units"] == 0).mean()),
                "CV of units": float(
                    (per_series.std() / per_series.mean()).replace(np.inf, np.nan).mean()
                ),
            }
        )
    return pd.DataFrame(rows)


def demand_tables(paths: ProjectPaths, stage: Stage) -> list[Table]:
    """Demand of the development and evaluated spans (channel total), and demand patterns."""
    protocol = load_project_config(paths.configs, ProtocolConfig)
    profile = pd.read_parquet(paths.series / "profile.parquet")
    selected = profile[profile["selected"]]
    if stage == "development":
        panel = pd.read_parquet(paths.series / "panel_development.parquet")
        spans = [_demand_summary(panel, "development")]
    else:
        panel = load_evaluation(paths, protocol, stage).panel
        spans = [_demand_summary(panel, "development"), _demand_summary(panel, "test")]
    selected_ids = set(selected["series_id"])
    demand = pd.concat(spans, ignore_index=True)
    demand = demand[demand["level"] != "sku"]  # SKU rows below, restricted to the panel
    sku = panel[panel["series_id"].isin(selected_ids) & (panel["level"] == "sku")]
    sku_rows = [
        _demand_summary(sku, split) for split in sku["split"].unique() if split != "excluded"
    ]
    demand = pd.concat([demand, *sku_rows], ignore_index=True).sort_values(
        ["frequency", "level", "span"]
    )
    patterns = (
        selected[selected["channel"] == CHANNEL]
        .pivot_table(
            index=["frequency", "level"], columns="pattern", values="series_id", aggfunc="count"
        )
        .fillna(0)
        .astype(int)
        .reset_index()
    )
    channels = (
        panel[(panel["level"] == "total") & (panel["split"].isin(["development", "test"]))]
        .pivot_table(index=["frequency", "split"], columns="channel", values="units", aggfunc="sum")
        .reset_index()
    )
    return [
        (
            f"Table T2. Demand of the development span and the {SPANS[stage]} (channel total)",
            demand,
        ),
        ("Table T3. Demand patterns of the evaluated series (ADI-CV², development span)", patterns),
        ("Table T4. Units by sales channel (level total)", channels),
    ]


def _refits(record: Mapping[str, object]) -> list[Mapping[str, object]]:
    """The refits that fine-tuned Chronos reported in a run record (none if absent)."""
    details = record.get("model_details", {})
    tuned = details.get("chronos_fine_tuned", {}) if isinstance(details, Mapping) else {}
    refits = tuned.get("refits", []) if isinstance(tuned, Mapping) else []
    return [refit for refit in refits if isinstance(refit, Mapping)]


def application_tables(paths: ProjectPaths, stage: Stage) -> list[Table]:
    """Time by stage per model, and each Chronos fine-tuning refit."""
    times, refits = [], []
    for frequency in FREQUENCIES:
        record = _record(latest_run(paths.runs, frequency, "validation", stage=stage))
        by_stage = record.get("seconds_by_stage", {})
        if isinstance(by_stage, Mapping):
            times += [
                {"frequency": frequency, "model": model, **seconds}
                for model, seconds in by_stage.items()
                if isinstance(seconds, Mapping)
            ]
        for refit in _refits(record):
            refits.append(
                {
                    "frequency": frequency,
                    "origin call": refit.get("call"),
                    "training windows": refit.get("train_windows"),
                    "steps": refit.get("steps"),
                    "best step": refit.get("best_step"),
                    "validation loss before": refit.get("initial_validation_loss"),
                    "validation loss after": refit.get("best_validation_loss"),
                    "seconds": refit.get("seconds"),
                }
            )
    return [
        (f"Table T5. Time by stage and model, seconds ({SPANS[stage]})", pd.DataFrame(times)),
        ("Table T6. Fine-tuning of Chronos at each refit", pd.DataFrame(refits)),
    ]


# --- 2. hypotheses ------------------------------------------------------------------------------


def _friedman_rows(metrics: pd.DataFrame, measure: str, alpha: float) -> list[dict[str, object]]:
    rows = []
    for (channel, level, horizon), frame in metrics.groupby(["channel", "level", "horizon"]):
        if level == "total":
            continue
        table = frame.pivot_table(index="series_id", columns="model", values=measure)
        result = friedman(table.replace([np.inf, -np.inf], np.nan), alpha)
        if result is None:
            continue
        best, worst = _best_worst(result.mean_ranks)
        rows.append(
            {
                "channel": channel,
                "level": level,
                "horizon": horizon,
                "series": result.series,
                "chi2": result.statistic,
                "p_value": result.p_value,
                REJECT: "yes" if result.p_value < alpha else "no",
                "best (rank)": f"{best} ({result.mean_ranks[best]:.2f})",
                "worst (rank)": f"{worst} ({result.mean_ranks[worst]:.2f})",
                "CD": result.critical_difference,
            }
        )
    return rows


def hypothesis_summary(paths: ProjectPaths, stage: Stage, alpha: float) -> Table:
    """HG: how many strata reject equality, per frequency and hypothesis."""
    rows = []
    for frequency in FREQUENCIES:
        he1 = _stats(paths, frequency, stage, "he1_friedman")
        he2 = _stats(paths, frequency, stage, "he2_service")
        he2 = he2[he2["test"] == "friedman_fill_rate"]
        he3 = _stats(paths, frequency, stage, "he3_robustness")
        for name, frame in (
            ("HE1: MASE (Friedman)", he1),
            ("HE2 (a): fill rate (Friedman, every scenario)", he2),
            ("HE3: relative change of MASE (Friedman)", he3),
        ):
            rows.append(
                {
                    "frequency": frequency,
                    "component": name,
                    "strata tested": len(frame),
                    "strata rejecting H0": int((frame["p_value"] < alpha).sum())
                    if len(frame)
                    else 0,
                }
            )
    return (
        "Table T7. General hypothesis: strata where the models differ (alpha = 0.05)",
        pd.DataFrame(rows),
    )


def he1_tables(paths: ProjectPaths, stage: Stage, alpha: float) -> list[Table]:
    mase, rmsse, patterns = [], [], []
    for frequency in FREQUENCIES:
        metrics = _metrics(paths, frequency, stage)
        for row in _friedman_rows(metrics, "mase", alpha):
            mase.append({"frequency": frequency, **row})
        for row in _friedman_rows(metrics, "rmsse", alpha):
            rmsse.append({"frequency": frequency, **row})
        sku = metrics[
            (metrics["channel"] == CHANNEL)
            & (metrics["level"] == "sku")
            & (metrics["horizon"] == 1)
        ]
        for pattern, frame in sku.groupby("pattern"):
            table = frame.pivot_table(index="series_id", columns="model", values="mase")
            table = table.replace([np.inf, -np.inf], np.nan).dropna(how="any")
            if table.empty:
                continue
            ranks = mean_ranks(table)
            result = friedman(table, alpha)
            patterns.append(
                {
                    "frequency": frequency,
                    "pattern": pattern,
                    "series": len(table),
                    "best (rank)": f"{ranks.index[0]} ({ranks.iloc[0]:.2f})",
                    "best mean MASE": f"{table.mean().idxmin()} ({table.mean().min():.3f})",
                    "p_value": result.p_value if result else np.nan,
                }
            )
    return [
        ("Table T8. HE1: Friedman on MASE by channel, level and horizon", pd.DataFrame(mase)),
        ("Table T9. HE1: Friedman on RMSSE by channel, level and horizon", pd.DataFrame(rmsse)),
        (
            "Table T10. HE1: SKU series by demand pattern (channel total, h = 1)",
            pd.DataFrame(patterns),
        ),
    ]


def he2_tables(paths: ProjectPaths, stage: Stage, config: StatsConfig) -> list[Table]:
    service, spearman = [], []
    for frequency in FREQUENCIES:
        metrics = _metrics(paths, frequency, stage)
        bias = (
            metrics[(metrics["channel"] == CHANNEL) & (metrics["horizon"] == 1)]
            .groupby(["level", "model"])["cumulative_bias"]
            .mean()
        )
        simulation = _simulation(paths, frequency, stage)
        primary = simulation[(simulation["channel"] == CHANNEL) & simulation["primary_scenario"]]
        summary = primary.groupby(["level", "model"]).agg(
            fill_rate=("fill_rate", "mean"),
            mean_on_hand=("mean_on_hand", "mean"),
            mean_safety_stock=("mean_safety_stock", "mean"),
            lost_units=("lost_units", "sum"),
            lost_value=("lost_value", "sum"),
        )
        summary["cumulative_bias"] = bias
        service.append(summary.reset_index().assign(frequency=frequency))
        table = _stats(paths, frequency, stage, "he2_spearman")
        for row in table.to_dict("records"):
            spearman.append(
                {
                    "frequency": frequency,
                    "channel": row["channel"],
                    "level": row["level"],
                    "rho": row["rho"],
                    "CI 95 %": f"{row['ci_low']:.2f} to {row['ci_high']:.2f}",
                    f"upper CI < {config.spearman_threshold}": (
                        "yes" if row["below_threshold"] else "no"
                    ),
                }
            )
    service_frame = pd.concat(service, ignore_index=True)
    columns = ["frequency", "level", "model"]
    service_frame = service_frame[columns + [c for c in service_frame if c not in columns]]
    friedman_rows = []
    for frequency in FREQUENCIES:
        he2 = _stats(paths, frequency, stage, "he2_service")
        chosen = he2[(he2["test"] == "friedman_fill_rate") & (he2["channel"] == CHANNEL)]
        for row in chosen.to_dict("records"):
            friedman_rows.append(
                {
                    "frequency": frequency,
                    "lead time": row["lead_time"],
                    "target": row["target"],
                    "level": row["level"],
                    "series": row["series"],
                    "chi2": row["statistic"],
                    "p_value": row["p_value"],
                    REJECT: "yes" if row["p_value"] < config.alpha else "no",
                }
            )
    return [
        (
            "Table T11. HE2: service, stock, lost sales and bias (channel total, primary scenario)",
            service_frame,
        ),
        (
            "Table T12. HE2 (a): Friedman on fill rate by scenario (channel total)",
            pd.DataFrame(friedman_rows),
        ),
        (
            "Table T13. HE2 (b): Spearman between the MASE and fill-rate rankings",
            pd.DataFrame(spearman),
        ),
    ]


def ranking_stability(paths: ProjectPaths, stage: Stage) -> Table:
    """Spearman between the model ranking on the development origins and on the evaluated ones."""
    rows = []
    for frequency in FREQUENCIES:
        development = _metrics(paths, frequency, "development")
        evaluated = _metrics(paths, frequency, stage)
        for level in LEVELS:
            ranks = []
            for frame in (development, evaluated):
                chosen = frame[
                    (frame["channel"] == CHANNEL)
                    & (frame["level"] == level)
                    & (frame["horizon"] == 1)
                ]
                table = chosen.pivot_table(index="series_id", columns="model", values="mase")
                ranks.append(mean_ranks(table.replace([np.inf, -np.inf], np.nan).dropna(how="any")))
            joined = pd.concat(ranks, axis=1, keys=["development", "evaluated"]).dropna()
            rho = stats.spearmanr(joined["development"], joined["evaluated"]).statistic
            rows.append(
                {
                    "frequency": frequency,
                    "level": level,
                    "best on development": joined["development"].idxmin(),
                    f"best on the {SPANS[stage]}": joined["evaluated"].idxmin(),
                    "Spearman rho of the rankings": float(rho),
                }
            )
    return (
        "Table T15. HE3: stability of the ranking between validation origins",
        pd.DataFrame(rows),
    )


def he3_tables(paths: ProjectPaths, stage: Stage, alpha: float) -> list[Table]:
    rows = []
    for frequency in FREQUENCIES:
        table = _stats(paths, frequency, stage, "he3_robustness")
        for row in table.to_dict("records"):
            best, worst = _best_worst(json.loads(row["mean_ranks"]))
            rows.append(
                {
                    "frequency": frequency,
                    "condition": row["condition"],
                    "channel": row["channel"],
                    "level": row["level"],
                    "horizon": row["horizon"],
                    "series": row["series"],
                    "chi2": row["statistic"],
                    "p_value": row["p_value"],
                    REJECT: "yes" if row["p_value"] < alpha else "no",
                    "most stable": best,
                    "least stable": worst,
                }
            )
    tables: list[Table] = [
        ("Table T14. HE3: Friedman on the relative change of MASE", pd.DataFrame(rows))
    ]
    if stage != "development":
        tables.append(ranking_stability(paths, stage))
    return tables


def run_thesis_tables(paths: ProjectPaths, stage: Stage = "test") -> Path:
    """Write every table to ``outputs/thesis/<timestamp>/tables.md``."""
    config = load_project_config(paths.configs, StatsConfig)
    tables: list[Table] = [normality_table(paths, stage, config.alpha)]
    tables += demand_tables(paths, stage)
    tables += application_tables(paths, stage)
    tables.append(hypothesis_summary(paths, stage, config.alpha))
    tables += he1_tables(paths, stage, config.alpha)
    tables += he2_tables(paths, stage, config)
    tables += he3_tables(paths, stage, config.alpha)
    started = datetime.now(UTC)
    out = paths.root / "outputs" / "thesis" / f"{started:%Y%m%dT%H%M%SZ}"
    out.mkdir(parents=True, exist_ok=False)
    note = (
        f"Generated {started.isoformat(timespec='seconds')} by `pcs thesis-tables` from the run "
        f"records, statistics tables and series panels. Results describe the {SPANS[stage]}. "
        "The rank-based tests are those declared in plan 2.6.6; the normality tests are "
        "descriptive."
    )
    (out / "tables.md").write_text(
        render(tables, note).replace(
            "# Evidence tables for the article", "# Tables for the thesis results chapter", 1
        ),
        encoding="utf-8",
    )
    return out
