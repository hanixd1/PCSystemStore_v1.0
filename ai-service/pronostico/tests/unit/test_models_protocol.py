from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pcsforecast.config import FrequencyProtocol, ModelsConfig, Window
from pcsforecast.evaluation.metrics import naive_scales, summarise
from pcsforecast.models.base import check_history
from pcsforecast.models.registry import build_models
from pcsforecast.models.statistical import (
    SES,
    TSB,
    Croston,
    Naive,
    croston_estimates,
    sba,
    ses_level,
)
from pcsforecast.protocol.origins import (
    SealedTestError,
    TrainView,
    assert_unsealed,
    validation_origins,
)
from pcsforecast.runner.engine import fit_seconds, run_engine, stage_seconds
from pcsforecast.runner.run import RunInputError, evaluated_protocol, sensitivity_protocol

INTERMITTENT = np.array([0, 2, 0, 0, 4, 0], dtype=np.float64)


def test_naive_repeats_the_last_value() -> None:
    assert Naive().forecast(np.array([3.0, 5.0]), 3).tolist() == [5.0, 5.0, 5.0]


def test_history_is_validated() -> None:
    for bad in (np.array([]), np.array([1.0, -1.0]), np.array([np.nan]), np.ones((2, 2))):
        with pytest.raises(ValueError, match="history"):
            check_history(bad)


def test_ses_recursion_and_alpha_choice() -> None:
    level, sse = ses_level(np.array([10.0, 20.0]), 0.5)
    assert (level, sse) == (15.0, 100.0)
    assert SES(alpha_grid=(0.5,)).forecast(np.array([10.0, 20.0]), 2).tolist() == [15.0, 15.0]
    constant = SES().forecast(np.array([4.0, 4.0, 4.0]), 1)
    assert constant.tolist() == [4.0]


def test_croston_estimates_by_hand() -> None:
    size, interval = croston_estimates(INTERMITTENT, 0.5)  # type: ignore[misc]
    assert size == pytest.approx(3.0)  # 2 → 2 + 0.5 * (4 - 2)
    assert interval == pytest.approx(2.5)  # 2 → 2 + 0.5 * (3 - 2)
    assert croston_estimates(np.zeros(4), 0.1) is None


def test_croston_sba_and_tsb_forecasts() -> None:
    croston = Croston(alpha=0.5).forecast(INTERMITTENT, 2)
    assert croston.tolist() == pytest.approx([1.2, 1.2])
    assert sba(alpha=0.5).forecast(INTERMITTENT, 1)[0] == pytest.approx(1.2 * 0.75)
    assert sba().name == "sba"
    assert Croston().forecast(np.zeros(3), 2).tolist() == [0.0, 0.0]
    tsb = TSB(alpha_d=0.5, alpha_p=0.5).forecast(INTERMITTENT, 1)[0]
    probability = 2 / 6
    for value in INTERMITTENT:
        probability += 0.5 * (float(value > 0) - probability)
    assert tsb == pytest.approx(probability * 3.0)
    assert TSB().forecast(np.zeros(3), 1).tolist() == [0.0]


def test_registry_reports_unimplemented_models() -> None:
    config = ModelsConfig.model_validate(
        {
            "status": "draft",
            "families": {
                "baseline": [{"name": "naive"}],
                "intermittent": [{"name": "tsb", "params": {"alpha_d": 0.2, "alpha_p": 0.3}}],
                "machine_learning": [{"name": "global_gbm"}],
                "pretrained": [{"name": "chronos_zero_shot"}],
            },
        }
    )
    models = build_models(config)
    assert [m.name for m in models.models] == ["naive", "tsb", "global_gbm"]
    assert models.models[1].alpha_p == 0.3  # type: ignore[union-attr]
    assert models.not_implemented == ("chronos_zero_shot",)


def test_naive_scales() -> None:
    assert naive_scales(np.array([1.0, 3.0, 2.0])) == (1.5, 2.5)
    assert all(np.isnan(naive_scales(np.array([1.0]))))


def _protocol(min_train: int = 3, horizons: tuple[int, ...] = (1, 2)) -> FrequencyProtocol:
    return FrequencyProtocol(
        min_train_periods=min_train,
        horizons=list(horizons),
        origin_step=1,
        window=Window(primary="rolling", length=3),
    )


def test_validation_origins_keep_targets_inside_development() -> None:
    origins = validation_origins(6, _protocol())
    assert [(o.position, o.horizons) for o in origins] == [(2, (1, 2)), (3, (1, 2)), (4, (1,))]


def test_train_view_is_trimmed_and_read_only() -> None:
    series = np.arange(10, dtype=np.float64)
    view = TrainView.at(series, 6, "rolling", 3)
    assert view.history.tolist() == [4.0, 5.0, 6.0]
    assert TrainView.at(series, 6, "expanding", 3).history.tolist() == list(range(7))
    with pytest.raises(ValueError, match="read-only"):
        view.history[0] = 99.0


def test_seal(tmp_path: Path) -> None:
    with pytest.raises(SealedTestError, match="sealed"):
        assert_unsealed(tmp_path)
    (tmp_path / "FREEZE.json").write_text(json.dumps({"status": "draft"}), encoding="utf-8")
    with pytest.raises(SealedTestError, match="frozen"):
        assert_unsealed(tmp_path)
    (tmp_path / "FREEZE.json").write_text(json.dumps({"status": "frozen"}), encoding="utf-8")
    assert assert_unsealed(tmp_path)["status"] == "frozen"


class _Exploding:
    name = "exploding"
    family = "baseline"

    def forecast(self, history: np.ndarray, horizon: int) -> np.ndarray:
        raise ArithmeticError("boom")


def _panel(values: list[int]) -> pd.DataFrame:
    periods = pd.date_range("2024-01-01", periods=len(values), freq="W-MON")
    return pd.DataFrame({"series_id": "s", "period_start": periods, "units": values})


def test_engine_is_paired_and_logs_failures() -> None:
    result = run_engine(
        _panel([1, 0, 2, 0, 3, 1]), ["s"], [Naive(), sba(), _Exploding()], _protocol()
    )
    predictions = result.predictions
    by_model = predictions.groupby("model")[["origin", "horizon"]].apply(
        lambda f: sorted(zip(f["origin"], f["horizon"], strict=True))
    )
    assert by_model["naive"] == by_model["sba"]
    assert len(predictions[predictions["model"] == "naive"]) == 5
    assert {f["model"] for f in result.failures} == {"exploding"}
    assert set(result.seconds_by_model) == {"naive", "sba", "exploding"}
    first = predictions[(predictions["model"] == "naive") & (predictions["horizon"] == 1)].iloc[0]
    assert (first["y_hat"], first["y_true"], first["train_periods"]) == (2.0, 0.0, 3)


def test_engine_never_passes_values_after_the_origin() -> None:
    seen: list[np.ndarray] = []

    class Spy:
        name = "spy"
        family = "baseline"

        def forecast(self, history: np.ndarray, horizon: int) -> np.ndarray:
            seen.append(history.copy())
            return np.zeros(horizon)

    values = [5, 6, 7, 8, 9, 10]
    result = run_engine(_panel(values), ["s"], [Spy()], _protocol())
    origins = sorted(set(result.predictions["origin"]))
    for history, origin in zip(seen, origins, strict=True):
        position = list(_panel(values)["period_start"]).index(origin)
        assert history[-1] == values[position]
        assert history.size <= 3


def test_summarise_scaled_errors() -> None:
    predictions = pd.DataFrame(
        {
            "series_id": "s",
            "frequency": "weekly",
            "model": ["naive", "naive", "ses", "ses"],
            "family": "baseline",
            "origin": [1, 2, 1, 2],
            "horizon": 1,
            "y_true": [2.0, 4.0, 2.0, 4.0],
            "y_hat": [1.0, 2.0, 2.0, 3.0],
            "scale_mae": [1.0, 1.0, 1.0, 1.0],
            "scale_mse": [1.0, 1.0, 1.0, 1.0],
        }
    )
    metrics = summarise(predictions).set_index("model")
    assert metrics.loc["naive", "mae"] == 1.5
    assert metrics.loc["naive", "mase"] == 1.5
    assert metrics.loc["naive", "rmsse"] == pytest.approx(np.sqrt(2.5))
    assert metrics.loc["ses", "bias"] == -0.5
    assert metrics.loc["ses", "cumulative_bias"] == -1.0
    assert metrics.loc["ses", "rel_mae"] == pytest.approx(0.5 / 1.5)
    assert metrics.loc["ses", "origins"] == 2


def test_zero_scale_gives_undefined_mase() -> None:
    predictions = pd.DataFrame(
        {
            "series_id": "s",
            "frequency": "weekly",
            "model": "naive",
            "family": "baseline",
            "origin": [1],
            "horizon": 1,
            "y_true": [1.0],
            "y_hat": [0.0],
            "scale_mae": [0.0],
            "scale_mse": [0.0],
        }
    )
    metrics = summarise(predictions)
    assert pd.isna(metrics.loc[0, "mase"])
    assert pd.isna(metrics.loc[0, "rmsse"])


def test_run_time_is_split_into_preparation_fit_and_inference() -> None:
    assert stage_seconds(10.0, 1.0, 6.0) == {"preparation": 1.0, "fit": 6.0, "inference": 3.0}
    # Statistical models fit and forecast in one recursion: no separate fit time.
    assert stage_seconds(2.0, 0.5, None) == {"preparation": 0.5, "fit": None, "inference": 1.5}
    assert stage_seconds(1.0, 0.6, 0.6)["inference"] == 0.0  # timer noise never goes negative
    assert fit_seconds(Naive()) is None
    protocol = FrequencyProtocol(
        min_train_periods=3, horizons=[1], origin_step=1, window=Window(primary="rolling", length=3)
    )
    panel = pd.DataFrame(
        {
            "series_id": ["s"] * 6,
            "period_start": pd.date_range("2025-01-06", periods=6, freq="W-MON"),
            "units": [1, 0, 2, 1, 0, 3],
        }
    )
    result = run_engine(panel, ["s"], [Naive()], protocol)
    stages = result.seconds_by_stage["naive"]
    assert stages["fit"] is None
    assert stages["preparation"] is not None
    assert stages["preparation"] >= 0


def test_condition_windows_and_sensitivity_pass() -> None:
    base = FrequencyProtocol(
        min_train_periods=18,
        horizons=[1],
        sensitivity_horizons=[3],
        origin_step=1,
        window=Window(primary="rolling", length=18, contrast="expanding"),
        truncated_length=9,
    )
    assert evaluated_protocol(base, "full").window == base.window
    assert evaluated_protocol(base, "truncated").window.length == 9
    assert evaluated_protocol(base, "expanding").window.primary == "expanding"
    assert evaluated_protocol(base, "expanding").horizons == [1]
    extra = sensitivity_protocol(base)
    assert extra is not None
    assert extra.horizons == [3]
    assert sensitivity_protocol(base.model_copy(update={"sensitivity_horizons": []})) is None
    bare = base.model_copy(
        update={"truncated_length": None, "window": Window(primary="rolling", length=18)}
    )
    with pytest.raises(RunInputError, match="truncated_length"):
        evaluated_protocol(bare, "truncated")
    with pytest.raises(RunInputError, match="contrast"):
        evaluated_protocol(bare, "expanding")
