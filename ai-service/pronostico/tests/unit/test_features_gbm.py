from __future__ import annotations

from collections.abc import Mapping

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from pcsforecast.config import Window
from pcsforecast.features.lagged import (
    FEATURE_NAMES,
    MIN_CONTEXT,
    build_design,
    features_at,
    history_scale,
    stack_designs,
)
from pcsforecast.models.base import FloatArray, PanelForecaster
from pcsforecast.models.gbm import GlobalGBM, TwoStageGBM
from pcsforecast.models.statistical import Naive
from pcsforecast.runner.paths import common_length, forecast_paths

HISTORY = np.array([0, 2, 0, 0, 4, 0, 1, 3], dtype=np.float64)


def _panel(seed: int = 0, series: int = 6, length: int = 40) -> dict[str, np.ndarray]:
    rng = np.random.default_rng(seed)
    return {
        f"s{i}": rng.poisson(1.0 + i % 3, size=length).astype(np.float64) for i in range(series)
    }


def test_history_scale() -> None:
    assert history_scale(np.array([2.0, 4.0])) == 3.0
    assert history_scale(np.zeros(3)) == 1.0


def test_features_by_hand() -> None:
    features = features_at(HISTORY, 7, scale=1.0)
    named = dict(zip(FEATURE_NAMES, features, strict=False))
    assert [named[f"lag_{k}"] for k in (1, 2, 3, 4)] == [3.0, 1.0, 0.0, 4.0]
    assert named["mean_4"] == pytest.approx(2.0)
    assert named["mean_8"] == pytest.approx(10 / 8)
    assert named["mean_13"] == pytest.approx(10 / 8)
    assert named["occurrence_8"] == pytest.approx(4 / 8)
    assert named["periods_since_sale"] == 0.0
    assert named["mean_size"] == pytest.approx(2.5)
    quiet = features_at(np.array([1.0, 0.0, 0.0, 0.0]), 3, scale=1.0)
    assert dict(zip(FEATURE_NAMES, quiet, strict=False))["periods_since_sale"] == 3.0


def test_design_targets_stay_inside_the_history() -> None:
    design = build_design(HISTORY, horizon=2)
    positions = range(MIN_CONTEXT - 1, HISTORY.size - 1)
    expected_rows = sum(min(2, HISTORY.size - 1 - p) for p in positions)
    assert design.x_train.shape == (expected_rows, len(FEATURE_NAMES))
    assert design.x_predict.shape == (2, len(FEATURE_NAMES))
    assert design.x_predict[:, -1].tolist() == [1.0, 2.0]
    assert design.scale == pytest.approx(HISTORY.mean())
    assert design.y_train.max() * design.scale <= HISTORY.max()


def test_short_histories_have_no_rows() -> None:
    design = build_design(np.array([1.0, 2.0]), horizon=3)
    assert design.x_train.shape == (0, len(FEATURE_NAMES))
    assert design.x_predict.shape == (0, len(FEATURE_NAMES))


def test_stack_designs_adds_series_codes() -> None:
    designs = [build_design(HISTORY, 1), build_design(HISTORY * 2, 1)]
    x, y, owners = stack_designs(designs, with_series_code=True)
    assert x.shape[1] == len(FEATURE_NAMES) + 1
    assert set(x[:, -1]) == {0.0, 1.0}
    assert len(y) == len(owners) == x.shape[0]
    empty_x, empty_y, empty_owners = stack_designs([], with_series_code=False)
    assert empty_x.shape == (0, len(FEATURE_NAMES))
    assert empty_y.size == empty_owners.size == 0


@settings(max_examples=30, deadline=None)
@given(st.lists(st.integers(min_value=0, max_value=9), min_size=8, max_size=30))
def test_features_ignore_values_after_the_position(values: list[int]) -> None:
    history = np.array(values, dtype=np.float64)
    position = max(MIN_CONTEXT - 1, len(values) // 2)
    changed = history.copy()
    changed[position + 1 :] += 100
    assert np.array_equal(features_at(history, position, 1.0), features_at(changed, position, 1.0))


@pytest.mark.parametrize("model", [TwoStageGBM(), GlobalGBM()])
def test_gbm_models_forecast_every_series(model: PanelForecaster) -> None:
    histories = _panel()
    forecasts = model.forecast_panel(histories, 3)
    assert set(forecasts) == set(histories)
    for path in forecasts.values():
        assert path.shape == (3,)
        assert (path >= 0).all()
        assert np.isfinite(path).all()


@pytest.mark.parametrize("model", [TwoStageGBM(), GlobalGBM()])
def test_gbm_models_are_deterministic(model: PanelForecaster) -> None:
    first = model.forecast_panel(_panel(1), 2)
    second = model.forecast_panel(_panel(1), 2)
    for key in first:
        assert np.array_equal(first[key], second[key])


@pytest.mark.parametrize("model", [TwoStageGBM(), GlobalGBM()])
def test_gbm_models_fall_back_on_tiny_panels(model: PanelForecaster) -> None:
    forecasts = model.forecast_panel({"a": np.array([1.0, 3.0])}, 2)
    assert forecasts["a"].tolist() == [2.0, 2.0]


def test_two_stage_handles_constant_occurrence() -> None:
    always = {f"s{i}": np.full(30, 2.0 + i) for i in range(3)}
    forecasts = TwoStageGBM(params={"rounds": 20}).forecast_panel(always, 1)
    assert all((path > 0).all() for path in forecasts.values())


def test_global_falls_back_without_sales() -> None:
    zeros = {f"s{i}": np.zeros(30) for i in range(3)}
    assert GlobalGBM().forecast_panel(zeros, 1)["s0"].tolist() == [1.0]


def test_gbm_rejects_invalid_histories() -> None:
    model, invalid = GlobalGBM(), {"a": np.array([-1.0, 2.0])}
    with pytest.raises(ValueError, match="history"):
        model.forecast_panel(invalid, 1)


class _BrokenPanel:
    name = "broken"
    family = "machine_learning"

    def forecast_panel(
        self, histories: Mapping[str, FloatArray], horizon: int
    ) -> dict[str, FloatArray]:
        raise ValueError("boom")


def test_forecast_paths_for_local_and_panel_models() -> None:
    series = _panel(series=3, length=12)
    window = Window(primary="rolling", length=6)
    local = forecast_paths(Naive(), series, [5, 6], window, 2)
    assert local.paths["s0"][5].tolist() == [series["s0"][5]] * 2
    broken = forecast_paths(_BrokenPanel(), series, [5, 6], window, 2)
    assert [f["origin"] for f in broken.failures] == [5, 6]
    assert broken.paths == {"s0": {}, "s1": {}, "s2": {}}


def test_common_length() -> None:
    assert common_length({"a": np.zeros(3), "b": np.ones(3)}) == 3
    with pytest.raises(ValueError, match="share the calendar"):
        common_length({"a": np.zeros(3), "b": np.ones(4)})


@pytest.mark.parametrize("model", [TwoStageGBM(), GlobalGBM()])
def test_gbm_models_report_their_training_time(model: TwoStageGBM | GlobalGBM) -> None:
    rng = np.random.default_rng(4)
    histories = {f"s{i}": rng.poisson(2.0, 30).astype(float) for i in range(6)}
    assert model.fit_seconds == 0.0
    model.forecast_panel(histories, 2)
    first = model.fit_seconds
    assert first > 0
    model.forecast_panel(histories, 2)
    assert model.fit_seconds > first  # accumulates across origins
