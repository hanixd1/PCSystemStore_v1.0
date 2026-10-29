from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from scipy import stats as scipy_stats

from pcsforecast.config import StatsConfig, load_project_config
from pcsforecast.paths import ProjectPaths
from pcsforecast.stats.run import (
    StatsInputError,
    break_changes,
    condition_changes,
    he1_diebold_mariano,
    he1_friedman,
    he2_service,
    he2_spearman,
    he3_relative_change,
    latest_run,
    run_stats,
)
from pcsforecast.stats.tests import (
    diebold_mariano,
    friedman,
    holm,
    nemenyi,
    nemenyi_critical_difference,
    spearman_block_bootstrap,
    wilcoxon_pairs,
)

MODELS = ["naive", "ses", "croston"]


@pytest.fixture
def config(project_root: Path) -> StatsConfig:
    loaded = load_project_config(project_root / "configs", StatsConfig)
    return loaded.model_copy(update={"bootstrap_resamples": 50})


def scores(n: int = 30, seed: int = 1) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    base = rng.uniform(0.5, 1.5, n)
    return pd.DataFrame(
        {"naive": base + 0.3, "ses": base + rng.normal(0, 0.05, n), "croston": base + 0.1},
        index=[f"s{i}" for i in range(n)],
    )


def test_friedman_matches_scipy_and_demsar_critical_difference() -> None:
    table = scores()
    result = friedman(table)
    assert result is not None
    expected = scipy_stats.friedmanchisquare(*(table[c] for c in table))
    assert result.statistic == pytest.approx(expected.statistic)
    assert result.p_value == pytest.approx(expected.pvalue)
    assert list(result.mean_ranks) == ["ses", "croston", "naive"]
    # Demšar (2006): q_0.05 = 2.343 for k = 3 models.
    assert nemenyi_critical_difference(3, 30, 0.05) == pytest.approx(
        2.343 * np.sqrt(3 * 4 / (6 * 30)), rel=1e-3
    )
    assert friedman(table[["naive", "ses"]]) is None


def test_nemenyi_is_symmetric_and_separates_distant_models() -> None:
    table = nemenyi(scores())
    assert np.allclose(table.to_numpy(), table.to_numpy().T)
    assert float(np.asarray(table.loc["ses", "naive"])) < 0.05
    assert float(np.asarray(table.loc["ses", "ses"])) == 1.0


def test_holm_adjustment() -> None:
    assert holm([0.01, 0.04, 0.03]) == pytest.approx([0.03, 0.06, 0.06])
    assert holm([0.5, 0.9]) == pytest.approx([1.0, 1.0])


def test_diebold_mariano() -> None:
    rng = np.random.default_rng(3)
    good = rng.normal(0, 1, 60)
    bad = good * 3
    statistic, p_value = diebold_mariano(bad, good, horizon=1)
    assert statistic > 0
    assert p_value < 0.01
    flipped, _ = diebold_mariano(good, bad, horizon=4)
    assert flipped < 0
    assert np.isnan(diebold_mariano(good[:2], bad[:2], 1)[0])
    assert np.isnan(diebold_mariano(good, good, 1)[1])


def test_wilcoxon_pairs_and_spearman_bootstrap() -> None:
    table = scores()
    pairs = wilcoxon_pairs(table, [("ses", "naive"), ("ses", "absent")])
    assert len(pairs) == 1
    assert float(np.asarray(pairs.loc[0, "p_holm"])) < 0.05
    same = wilcoxon_pairs(table.assign(ses=table["naive"]), [("ses", "naive")])
    assert float(np.asarray(same.loc[0, "p_value"])) == 1.0

    def by_mean(t: pd.DataFrame) -> pd.Series:
        return t.mean()

    result = spearman_block_bootstrap(
        table, table, rank_first=by_mean, rank_second=by_mean, resamples=20, seed=1
    )
    assert result.rho == pytest.approx(1.0)
    assert result.ci_low <= result.rho <= result.ci_high


def metrics_frame() -> pd.DataFrame:
    table = scores()
    rows = [
        {
            "series_id": f"weekly:total:sku:{sid}",
            "channel": "total",
            "level": "sku",
            "horizon": h,
            "model": model,
            "mase": value * (1 + 0.1 * h),
        }
        for sid, row in table.iterrows()
        for model, value in row.items()
        for h in (1, 4)
    ]
    return pd.DataFrame(rows)


def predictions_frame() -> pd.DataFrame:
    rng = np.random.default_rng(5)
    origins = pd.date_range("2025-01-06", periods=40, freq="W-MON")
    rows = []
    for sid in ("a", "b"):
        for origin in origins:
            truth = float(rng.poisson(3))
            for model, noise in (("naive", 2.0), ("ses", 1.0), ("croston", 1.5)):
                rows.append(
                    {
                        "series_id": f"weekly:total:sku:{sid}",
                        "model": model,
                        "origin": origin,
                        "horizon": 1,
                        "target_period": origin + pd.Timedelta(days=7),
                        "y_true": truth,
                        "y_hat": truth + rng.normal(0, noise),
                        "scale_mae": 1.0,
                    }
                )
    return pd.DataFrame(rows)


def simulation_frame() -> pd.DataFrame:
    table = scores()
    return pd.DataFrame(
        [
            {
                "series_id": f"weekly:total:sku:{sid}",
                "channel": "total",
                "level": "sku",
                "model": model,
                "lead_time": 1,
                "fill_rate_target": 0.95,
                "fill_rate": 1.0 - value / 3,
                "mean_on_hand": value * 10,
            }
            for sid, row in table.iterrows()
            for model, value in row.items()
        ]
    )


def test_hypothesis_tables(config: StatsConfig) -> None:
    metrics = metrics_frame()
    he1, posthoc = he1_friedman(metrics, config)
    assert set(he1["horizon"]) == {1, 4}
    assert (he1["p_value"] < 0.05).all()
    assert set(posthoc.columns) >= {"model_a", "model_b", "p_value", "channel", "horizon"}

    dm = he1_diebold_mariano(predictions_frame(), config)
    row = dm[(dm["model_a"] == "ses") & (dm["model_b"] == "naive")].iloc[0]
    assert int(row["series_tested"]) == 2
    assert float(row["median_statistic"]) < 0  # ses has the smaller errors

    service = he2_service(simulation_frame(), config)
    assert {"friedman_fill_rate", "wilcoxon_fill_rate", "wilcoxon_mean_on_hand"} <= set(
        service["test"]
    )
    spearman = he2_spearman(metrics, simulation_frame(), config)
    assert float(np.asarray(spearman.loc[0, "rho"])) == pytest.approx(1.0)
    assert not bool(spearman.loc[0, "below_threshold"])


def test_robustness_changes(config: StatsConfig) -> None:
    predictions = predictions_frame()
    changes = break_changes(predictions, date(2025, 6, 1))
    assert set(changes.columns) == {"series_id", "model", "horizon", "relative_change"}
    assert break_changes(predictions, date(2030, 1, 1)).empty
    metrics = metrics_frame()
    truncated = metrics.assign(mase=metrics["mase"] * 1.2)
    relative = condition_changes(metrics, truncated)
    assert relative["relative_change"].round(6).eq(0.2).all()
    table = he3_relative_change(
        relative.assign(relative_change=relative["relative_change"] + np.arange(len(relative))),
        metrics,
        config,
        "truncated",
    )
    assert set(table["condition"]) == {"truncated"}
    assert json.loads(str(table.loc[0, "median_change"]))


def test_run_stats_writes_tables(tmp_path: Path, config: StatsConfig) -> None:
    paths = ProjectPaths(tmp_path)
    with pytest.raises(StatsInputError):
        latest_run(paths.runs, "weekly", "validation")
    for name, mode, condition in (
        ("20260101T000000Z-weekly-validation", "internal_validation", "full"),
        ("20260101T000001Z-weekly-validation-truncated", "internal_validation", "truncated"),
        ("20260101T000002Z-weekly-inventory", "inventory_simulation", "full"),
    ):
        out = paths.runs / name
        out.mkdir(parents=True)
        record = {"mode": mode, "condition": condition, "frequency": "weekly"}
        (out / "run.json").write_text(json.dumps(record), encoding="utf-8")
        metrics_frame().to_parquet(out / "metrics.parquet")
        predictions_frame().to_parquet(out / "predictions.parquet")
        simulation_frame().to_parquet(out / "simulation.parquet")
    (paths.runs / "no-record-weekly-x").mkdir()
    result = run_stats(paths, "weekly", config, date(2025, 6, 1))
    record = json.loads((result / "stats.json").read_text(encoding="utf-8"))
    assert record["sources"]["truncated"].endswith("truncated")
    assert record["test_span_used"] is False
    assert all(record["rows"][name] > 0 for name in ("he1_friedman", "he2_spearman"))
