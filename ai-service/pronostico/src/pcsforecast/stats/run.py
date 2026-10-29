"""F7 step: statistical comparison of the models on the latest runs (plan 2.6.6, Table 14).

Run on internal validation (development span), and with ``stage="test"`` once on the final
test after the freeze (``stage="rehearsal"`` checks that path on the development span). Every
test uses one value per series and model; origins are never treated as independent observations.

* HE1 - Friedman + Nemenyi on MASE by channel, level and horizon; Diebold-Mariano per series for
  the predefined pairs.
* HE2 - Friedman on fill rate and Wilcoxon on fill rate and mean stock per inventory scenario;
  Spearman between the ranking by MASE and by fill rate with a series-block bootstrap.
* HE3 - relative change of MASE after the structural break, with truncated history and with the
  expanding contrast window (separate validation runs with ``condition = truncated`` or
  ``expanding``), compared across models with Friedman.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pcsforecast.config import StatsConfig
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.stages import Stage, run_mode
from pcsforecast.stats.tests import (
    diebold_mariano,
    friedman,
    holm,
    mean_ranks,
    nemenyi,
    spearman_block_bootstrap,
    wilcoxon_pairs,
)

RUN_RECORD = "run.json"


class StatsInputError(RuntimeError):
    """A run needed by the statistical comparison is missing."""


def latest_run(
    runs: Path,
    frequency: str,
    kind: str,
    condition: str = "full",
    stage: Stage = "development",
) -> Path:
    """Most recent run directory of a kind (``validation``/``inventory``), condition and stage."""
    mode = run_mode(kind, stage)
    found = []
    for directory in sorted(runs.glob(f"*-{frequency}-*")):
        record_path = directory / RUN_RECORD
        if not record_path.is_file():
            continue
        record = json.loads(record_path.read_text(encoding="utf-8"))
        if record.get("mode") == mode and record.get("condition", "full") == condition:
            found.append(directory)
    if not found:
        raise StatsInputError(f"no {condition} {kind} run ({stage}) for {frequency} in {runs}")
    return found[-1]


def score_table(frame: pd.DataFrame, value: str) -> pd.DataFrame:
    """series x model table of one value."""
    return frame.pivot_table(index="series_id", columns="model", values=value, aggfunc="first")


def _strata(frame: pd.DataFrame, config: StatsConfig) -> list[tuple[str, str, pd.DataFrame]]:
    frame = frame if "channel" in frame else frame.assign(channel="vecinos")
    strata: list[tuple[str, str, pd.DataFrame]] = []
    for _, rows in frame.groupby(["channel", "level"], sort=True):
        channel, level = str(rows["channel"].iloc[0]), str(rows["level"].iloc[0])
        if channel in config.channels and level in config.levels:
            strata.append((channel, level, rows))
    return strata


def _by_horizon(frame: pd.DataFrame) -> list[tuple[int, pd.DataFrame]]:
    return [(int(rows["horizon"].iloc[0]), rows) for _, rows in frame.groupby("horizon")]


# --- HE1 --------------------------------------------------------------------------------------


def he1_friedman(metrics: pd.DataFrame, config: StatsConfig) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Friedman per channel, level and horizon on MASE; Nemenyi p-values where it rejects."""
    rows, posthoc = [], []
    for channel, level, frame in _strata(metrics, config):
        for horizon, by_horizon in _by_horizon(frame):
            result = friedman(score_table(by_horizon, "mase"), config.alpha)
            if result is None:
                continue
            stratum: dict[str, Any] = {"channel": channel, "level": level, "horizon": horizon}
            rows.append({**stratum, **_friedman_row(result)})
            if result.p_value < config.alpha:
                table = nemenyi(score_table(by_horizon, "mase")).rename_axis("model_a")
                long = table.reset_index().melt(
                    id_vars="model_a", var_name="model_b", value_name="p_value"
                )
                long = long[long["model_a"] < long["model_b"]].copy()
                for column, value in stratum.items():
                    long[column] = value
                posthoc.append(long)
    nemenyi_table = pd.concat(posthoc, ignore_index=True) if posthoc else pd.DataFrame()
    return pd.DataFrame(rows), nemenyi_table


def _friedman_row(result: Any) -> dict[str, Any]:
    row = asdict(result)
    row["mean_ranks"] = json.dumps(row["mean_ranks"])
    return row


def he1_diebold_mariano(predictions: pd.DataFrame, config: StatsConfig) -> pd.DataFrame:
    """Per pair, channel and horizon: how many series favour each model (Holm across series)."""
    errors = predictions.assign(error=predictions["y_hat"] - predictions["y_true"])
    if "channel" not in errors:
        errors = errors.assign(channel=errors["series_id"].str.split(":").str[1])
    rows = []
    for _, frame in errors.groupby(["channel", "horizon"]):
        channel, horizon = str(frame["channel"].iloc[0]), int(frame["horizon"].iloc[0])
        if channel not in config.channels:
            continue
        wide = frame.pivot_table(
            index=["series_id", "origin"], columns="model", values="error", aggfunc="first"
        )
        for a, b in config.pairs:
            if a in wide and b in wide:
                rows.append(
                    {"channel": channel, "horizon": horizon, "model_a": a, "model_b": b}
                    | _dm_counts(wide[[a, b]].dropna(), horizon, config.alpha)
                )
    return pd.DataFrame(rows)


def _dm_counts(pairs: pd.DataFrame, horizon: int, alpha: float) -> dict[str, Any]:
    stats_by_series = [
        diebold_mariano(g.iloc[:, 0].to_numpy(), g.iloc[:, 1].to_numpy(), horizon)
        for _, g in pairs.groupby(level="series_id")
    ]
    tested = [(s, p) for s, p in stats_by_series if np.isfinite(p)]
    adjusted = holm([p for _, p in tested]) if tested else []
    return {
        "series_tested": len(tested),
        "a_better": sum(
            1 for (s, _), q in zip(tested, adjusted, strict=True) if q < alpha and s < 0
        ),
        "b_better": sum(
            1 for (s, _), q in zip(tested, adjusted, strict=True) if q < alpha and s > 0
        ),
        "median_statistic": float(np.median([s for s, _ in tested])) if tested else float("nan"),
    }


# --- HE2 --------------------------------------------------------------------------------------


def _scenario(simulation: pd.DataFrame, lead_time: int, target: float) -> pd.DataFrame:
    return simulation[
        (simulation["lead_time"] == lead_time) & (simulation["fill_rate_target"] == target)
    ]


def he2_service(simulation: pd.DataFrame, config: StatsConfig) -> pd.DataFrame:
    """Friedman on fill rate and Wilcoxon on fill rate and mean stock, per scenario and stratum."""
    rows = []
    scenarios = simulation[["lead_time", "fill_rate_target"]].drop_duplicates()
    for lead_time, target in scenarios.itertuples(index=False):
        chosen = _scenario(simulation, int(lead_time), float(target))
        for channel, level, frame in _strata(chosen, config):
            stratum = {
                "lead_time": int(lead_time),
                "target": float(target),
                "channel": channel,
                "level": level,
            }
            result = friedman(score_table(frame, "fill_rate"), config.alpha)
            if result is not None:
                rows.append({**stratum, "test": "friedman_fill_rate", **_friedman_row(result)})
            for measure in ("fill_rate", "mean_on_hand"):
                table = wilcoxon_pairs(score_table(frame, measure), config.pairs)
                rows += [
                    {**stratum, "test": f"wilcoxon_{measure}"} | {str(k): v for k, v in row.items()}
                    for row in table.to_dict("records")
                ]
    return pd.DataFrame(rows)


def _rank_by_mase(table: pd.DataFrame) -> pd.Series:
    return mean_ranks(table.dropna(how="any"))


def _fill_rate_by_model(table: pd.DataFrame) -> pd.Series:
    # Higher fill rate is better: rank 1 = highest, so both rankings read "1 = best".
    return table.mean(axis=0).rank(ascending=False)


def he2_spearman(
    metrics: pd.DataFrame, simulation: pd.DataFrame, config: StatsConfig
) -> pd.DataFrame:
    """Spearman between the model ranking by MASE (h = 1) and by fill rate, per channel/level."""
    primary = _scenario(
        simulation, config.primary_scenario.lead_time, config.primary_scenario.target
    )
    first_horizon = metrics[metrics["horizon"] == metrics["horizon"].min()]
    rows = []
    for channel, level, frame in _strata(first_horizon, config):
        served = primary[primary["series_id"].isin(frame["series_id"])]
        result = spearman_block_bootstrap(
            score_table(frame, "mase"),
            score_table(served, "fill_rate"),
            rank_first=_rank_by_mase,
            rank_second=_fill_rate_by_model,
            resamples=config.bootstrap_resamples,
            seed=config.seed,
        )
        rows.append(
            {"channel": channel, "level": level, **asdict(result)}
            | {"below_threshold": result.ci_high < config.spearman_threshold}
        )
    return pd.DataFrame(rows)


# --- HE3 --------------------------------------------------------------------------------------


def mase_by_period(predictions: pd.DataFrame, break_date: date) -> pd.DataFrame:
    """MASE per series, model and horizon, before and after the break (by target period)."""
    after = predictions["target_period"] >= pd.Timestamp(break_date)
    frame = predictions.assign(
        period=np.where(after, "after", "before"),
        abs_error=(predictions["y_hat"] - predictions["y_true"]).abs(),
    )
    grouped = frame.groupby(["series_id", "model", "horizon", "period"]).agg(
        mae=("abs_error", "mean"), scale=("scale_mae", "mean")
    )
    grouped["mase"] = grouped["mae"] / grouped["scale"].where(grouped["scale"] > 0)
    wide = grouped.reset_index().pivot_table(
        index=["series_id", "model", "horizon"], columns="period", values="mase", aggfunc="first"
    )
    return wide.reset_index()


def he3_relative_change(
    changes: pd.DataFrame, strata_source: pd.DataFrame, config: StatsConfig, condition: str
) -> pd.DataFrame:
    """Friedman across models on the relative change of MASE, per stratum and horizon."""
    labelled = changes.merge(
        strata_source[["series_id", "channel", "level"]].drop_duplicates(), on="series_id"
    )
    rows = []
    for channel, level, frame in _strata(labelled, config):
        for horizon, by_horizon in _by_horizon(frame):
            table = score_table(by_horizon, "relative_change")
            table = table.replace([np.inf, -np.inf], np.nan)
            result = friedman(table, config.alpha)
            if result is None:
                continue
            medians = table.dropna(how="any").median().to_dict()
            rows.append(
                {
                    "condition": condition,
                    "channel": channel,
                    "level": level,
                    "horizon": horizon,
                    **_friedman_row(result),
                    "median_change": json.dumps({str(k): float(v) for k, v in medians.items()}),
                }
            )
    return pd.DataFrame(rows)


def break_changes(predictions: pd.DataFrame, break_date: date) -> pd.DataFrame:
    split = mase_by_period(predictions, break_date)
    if not {"before", "after"} <= set(split.columns):
        return pd.DataFrame(columns=["series_id", "model", "horizon", "relative_change"])
    split["relative_change"] = split["after"] / split["before"] - 1.0
    return split[["series_id", "model", "horizon", "relative_change"]]


CONTRAST_CONDITIONS = ("truncated", "expanding")


def condition_changes(full: pd.DataFrame, other: pd.DataFrame) -> pd.DataFrame:
    """Relative change of MASE from the main run to a contrast run, per series and model."""
    keys = ["series_id", "model", "horizon"]
    joined = full[[*keys, "mase"]].merge(
        other[[*keys, "mase"]], on=keys, suffixes=("_full", "_other")
    )
    joined["relative_change"] = joined["mase_other"] / joined["mase_full"] - 1.0
    return joined[[*keys, "relative_change"]]


# --- step -------------------------------------------------------------------------------------


def stats_name(frequency: str, stage: Stage) -> str:
    """Suffix of a statistics directory: ``weekly``, ``weekly-test``, ``weekly-rehearsal``."""
    return frequency if stage == "development" else f"{frequency}-{stage}"


def run_stats(
    paths: ProjectPaths,
    frequency: str,
    config: StatsConfig,
    break_date: date | None,
    stage: Stage = "development",
) -> Path:
    """Write the F7 tables and report for one frequency into ``outputs/stats``."""
    validation = latest_run(paths.runs, frequency, "validation", stage=stage)
    inventory = latest_run(paths.runs, frequency, "inventory", stage=stage)
    metrics = pd.read_parquet(validation / "metrics.parquet")
    predictions = pd.read_parquet(validation / "predictions.parquet")
    simulation = pd.read_parquet(inventory / "simulation.parquet")

    tables: dict[str, pd.DataFrame] = {}
    tables["he1_friedman"], tables["he1_nemenyi"] = he1_friedman(metrics, config)
    tables["he1_diebold_mariano"] = he1_diebold_mariano(predictions, config)
    tables["he2_service"] = he2_service(simulation, config)
    tables["he2_spearman"] = he2_spearman(metrics, simulation, config)
    he3 = []
    if break_date is not None:
        he3.append(
            he3_relative_change(break_changes(predictions, break_date), metrics, config, "break")
        )
    sources = {"validation": validation.name, "inventory": inventory.name}
    for condition in CONTRAST_CONDITIONS:
        try:
            run = latest_run(paths.runs, frequency, "validation", condition, stage)
        except StatsInputError:
            continue
        changes = condition_changes(metrics, pd.read_parquet(run / "metrics.parquet"))
        he3.append(he3_relative_change(changes, metrics, config, condition))
        sources[condition] = run.name
    tables["he3_robustness"] = pd.concat(he3, ignore_index=True) if he3 else pd.DataFrame()

    started = datetime.now(UTC)
    out = paths.runs.parent / "stats" / f"{started:%Y%m%dT%H%M%SZ}-{stats_name(frequency, stage)}"
    out.mkdir(parents=True, exist_ok=False)
    for name, table in tables.items():
        table.to_parquet(out / f"{name}.parquet", index=False)
    record = {
        "frequency": frequency,
        "stage": stage,
        "created_at": started.isoformat(timespec="seconds"),
        "sources": sources,
        "alpha": config.alpha,
        "structural_break": break_date.isoformat() if break_date else None,
        "test_span_used": stage == "test",
        "rows": {name: len(table) for name, table in tables.items()},
    }
    (out / "stats.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out
