from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pcsforecast.reporting.dashboard_data import (
    latest_runs,
    leaderboard,
    monthly_counts,
    series_options,
)


def _metrics() -> pd.DataFrame:
    rows = []
    for series, values in {
        "a": (1.0, 0.5, 2.0),
        "b": (1.0, 2.0, 0.5),
        "c": (1.0, None, 0.4),
    }.items():
        for model, mase in zip(("naive", "ses", "tsb"), values, strict=True):
            rows.append(
                {
                    "series_id": series,
                    "level": "sku",
                    "model": model,
                    "horizon": 1,
                    "mase": mase,
                    "rmsse": mase,
                    "bias": 0.1,
                    "rel_mae": None if mase is None else mase,
                }
            )
    return pd.DataFrame(rows)


def test_leaderboard_ranks_only_series_complete_for_every_model() -> None:
    table = leaderboard(_metrics(), 1).set_index("model")
    assert table.loc["naive", "series"] == 3
    assert table.loc["ses", "mean_rank"] == 2.0  # ranks 1 (a) and 3 (b); c is incomplete
    assert table.loc["tsb", "share_beats_naive"] == 2 / 3
    assert table["level"].eq("sku").all()


def test_monthly_counts() -> None:
    audit = {
        "currentness": {
            "valid_lines_by_month": {"2024-01": 3, "2024-02": 1},
            "valid_units_by_month": {"2024-01": 4, "2024-02": 1},
        }
    }
    frame = monthly_counts(audit)
    assert frame.to_dict(orient="list") == {
        "month": ["2024-01", "2024-02"],
        "lines": [3, 1],
        "units": [4, 1],
    }


def test_series_options_lists_selected_series_by_volume() -> None:
    profile = pd.DataFrame(
        {
            "frequency": ["weekly"] * 3,
            "level": ["sku"] * 3,
            "key": ["S1", "S2", "S3"],
            "units": [5, 9, 7],
            "selected": [True, True, False],
        }
    )
    assert series_options(profile, "weekly", "sku") == ["S2", "S1"]


def test_latest_runs_skips_incomplete_runs(tmp_path: Path) -> None:
    assert latest_runs(tmp_path / "missing") == {}
    for name, complete in (("2026-a", True), ("2026-b", True), ("2026-c", False)):
        directory = tmp_path / name
        directory.mkdir()
        (directory / "run.json").write_text(json.dumps({"frequency": "weekly"}), encoding="utf-8")
        if complete:
            _metrics().to_parquet(directory / "metrics.parquet")
    runs = latest_runs(tmp_path)
    assert list(runs) == ["weekly"]
    assert runs["weekly"].run_id == "2026-b"


def test_retail_data_is_aggregated_by_month_and_kind(tmp_path: Path) -> None:
    from pcsforecast.paths import ProjectPaths  # noqa: PLC0415
    from pcsforecast.reporting.dashboard_data import load_retail_data  # noqa: PLC0415

    paths = ProjectPaths(tmp_path)
    assert load_retail_data(paths) is None
    clean = paths.clean / "retail"
    clean.mkdir(parents=True)
    (clean / "audit_report.json").write_text(json.dumps({"completeness": {}}), "utf-8")
    pd.DataFrame(
        {
            "receipt_key": ["A-1", "A-1", "B-1"],
            "issue_date": pd.to_datetime(["2026-05-02", "2026-05-02", "2026-06-01"]),
            "doc_kind": ["factura", "factura", "boleta"],
            "quantity": [2.0, 1.0, 1.0],
            "net_amount": [100.0, 50.0, 20.0],
        }
    ).to_parquet(clean / "retail_lines.parquet")
    pd.DataFrame({"month": ["2026-05"], "delivered_share": [1.0]}).to_parquet(
        clean / "coverage_by_month.parquet"
    )
    retail = load_retail_data(paths)
    assert retail is not None
    assert retail.monthly.to_dict("records") == [
        {
            "month": "2026-05",
            "doc_kind": "factura",
            "receipts": 1,
            "units": 3.0,
            "net_sales": 150.0,
        },
        {"month": "2026-06", "doc_kind": "boleta", "receipts": 1, "units": 1.0, "net_sales": 20.0},
    ]


def test_channel_helpers_handle_runs_before_the_amendment() -> None:
    from pcsforecast.reporting.dashboard_data import (  # noqa: PLC0415
        channel_options,
        channel_volumes,
        series_options,
        with_channel,
    )

    legacy = pd.DataFrame({"series_id": ["a"]})
    assert with_channel(legacy)["channel"].tolist() == ["vecinos"]
    profile = pd.DataFrame(
        {
            "frequency": ["weekly"] * 3,
            "channel": ["facturado", "total", "total"],
            "level": ["sku"] * 3,
            "key": ["S1", "S1", "S2"],
            "selected": [True, True, True],
            "units": [5, 9, 20],
        }
    )
    assert channel_options(profile) == ["total", "facturado"]
    assert series_options(profile, "weekly", "sku", "total") == ["S2", "S1"]
    panel = pd.DataFrame(
        {
            "frequency": ["monthly"] * 3,
            "level": ["total"] * 3,
            "channel": ["vecinos", "facturado", "total"],
            "period_start": pd.to_datetime(["2024-01-01"] * 3),
            "units": [3, 2, 5],
        }
    )
    assert channel_volumes(panel)["channel"].tolist() == ["vecinos", "facturado"]


def test_latest_stats_and_friedman_summary(tmp_path: Path) -> None:
    from pcsforecast.reporting.dashboard_data import friedman_summary, latest_stats  # noqa: PLC0415

    assert latest_stats(tmp_path / "absent") == {}
    run = tmp_path / "stats" / "20260101T000000Z-weekly"
    run.mkdir(parents=True)
    (run / "stats.json").write_text(json.dumps({"frequency": "weekly", "alpha": 0.05}), "utf-8")
    table = pd.DataFrame(
        {
            "channel": ["total", "vecinos"],
            "level": ["sku", "sku"],
            "horizon": [1, 1],
            "series": [10, 8],
            "statistic": [5.0, 1.0],
            "p_value": [0.01, 0.6],
            "critical_difference": [0.9, 1.0],
            "mean_ranks": [json.dumps({"naive": 2.5, "ses": 1.5}), json.dumps({"naive": 1.0})],
        }
    )
    table.to_parquet(run / "he1_friedman.parquet")
    (tmp_path / "stats" / "incomplete").mkdir()
    stats = latest_stats(tmp_path / "stats")
    assert list(stats) == ["weekly"]
    summary = friedman_summary(stats["weekly"].tables["he1_friedman"], "total")
    assert summary.loc[0, "best_model"] == "ses"
    assert summary.loc[0, "worst_model"] == "naive"
    assert friedman_summary(table, "facturado").empty
