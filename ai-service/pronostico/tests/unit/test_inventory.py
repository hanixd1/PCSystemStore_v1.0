from __future__ import annotations

import math

import numpy as np
import pytest
from hypothesis import given
from hypothesis import strategies as st

from pcsforecast.config import FrequencyProtocol, InventoryConfig, Window
from pcsforecast.inventory.calibrator import calibrate
from pcsforecast.inventory.run import (
    _SeriesData,
    last_known_prices,
    mean_training_prices,
    origin_spans,
    scenarios,
)
from pcsforecast.inventory.simulator import SimulationResult, protection_sigma, simulate


def _result(fill: float) -> SimulationResult:
    return SimulationResult(
        periods=1,
        demand=1.0,
        served=fill,
        lost=1.0 - fill,
        mean_on_hand=0.0,
        mean_safety_stock=0.0,
        orders=0,
        lost_value=0.0,
        lost_unpriced_units=0.0,
    )


def test_simulation_by_hand() -> None:
    demand = np.array([0.0, 3.0, 1.0, 4.0], dtype=np.float64)
    forecasts = {0: 4.0, 1: 4.0, 2: 4.0}
    sigmas = {0: 0.0, 1: 0.0, 2: 0.0}
    result = simulate(
        demand,
        [0, 1, 2],
        forecasts,
        sigmas,
        multiplier=1.0,
        lead_time=1,
        prices={0: 10.0, 1: 10.0, 2: 10.0},
    )
    # t=1: stock 4, sells 3 → 1; position 1 < 4 → order 3 available at t=3
    # t=2: sells 1 → 0; position 0 + 3 on order < 4 → order 1 available at t=4 (beyond horizon)
    # t=3: receives 3, demand 4 → sells 3, loses 1
    assert (result.demand, result.served, result.lost) == (8.0, 7.0, 1.0)
    assert result.fill_rate == pytest.approx(7 / 8)
    assert result.orders == 2
    assert result.mean_on_hand == pytest.approx((1 + 0 + 0) / 3)
    assert result.lost_value == pytest.approx(10.0)
    assert result.periods == 3


def test_safety_stock_and_unpriced_losses() -> None:
    demand = np.array([0.0, 5.0], dtype=np.float64)
    result = simulate(demand, [0], {0: 2.0}, {0: 1.0}, multiplier=2.0, lead_time=1)
    assert result.served == 4.0  # initial stock ceil(2 + 2 * 1)
    assert result.lost_unpriced_units == 1.0
    assert result.lost_value == 0.0
    assert result.mean_safety_stock == 0.0  # no order placed after the last origin


def test_fill_rate_without_demand_is_one() -> None:
    result = simulate(
        np.zeros(3), [0, 1], {0: 0.0, 1: 0.0}, {0: 0.0, 1: 0.0}, multiplier=0.0, lead_time=1
    )
    assert result.fill_rate == 1.0


def test_protection_sigma() -> None:
    assert protection_sigma(np.array([1.0, 3.0, 1.0]), 4) == pytest.approx(4.0)
    assert protection_sigma(np.array([2.0]), 2) == 0.0


def test_calibrate_picks_the_smallest_sufficient_multiplier() -> None:
    fills = {0.0: 0.8, 0.5: 0.96, 1.0: 0.99}
    calls: list[float] = []

    def run(multiplier: float) -> SimulationResult:
        calls.append(multiplier)
        return _result(fills[multiplier])

    chosen = calibrate([0.0, 0.5, 1.0], 0.95, run)
    assert (chosen.multiplier, chosen.target_reached) == (0.5, True)
    assert calls == [0.0, 0.5]
    unreachable = calibrate([0.0, 0.5, 1.0], 0.995, run)
    assert (unreachable.multiplier, unreachable.target_reached) == (1.0, False)
    assert unreachable.calibration_fill_rate == 0.99
    with pytest.raises(ValueError, match="empty"):
        calibrate([], 0.9, run)


def test_scenarios_follow_table_21(project_root: object) -> None:
    config = InventoryConfig.model_validate(
        {
            "status": "draft",
            "policy": "periodic_review_order_up_to",
            "review_period": 1,
            "lead_time": {"primary": 1, "sensitivity": [2]},
            "fill_rate_target": {"primary": 0.95, "sensitivity": [0.90, 0.99]},
            "initial_stock": "target_level_at_first_origin",
            "lost_sales_valuation": {"primary": "price_known_at_origin"},
            "safety_stock": {"grid_multipliers": [0.0, 1.0]},
        }
    )
    cases = [(c.lead_time, c.target, c.primary) for c in scenarios(config)]
    assert cases == [(1, 0.95, True), (2, 0.95, False), (1, 0.90, False), (1, 0.99, False)]


def test_origin_spans_split_in_halves() -> None:
    protocol = FrequencyProtocol(
        min_train_periods=3, horizons=[1], origin_step=1, window=Window(primary="rolling", length=3)
    )
    assert origin_spans(9, protocol) == ([2, 3, 4], [5, 6, 7])


def test_price_rules_use_the_training_window() -> None:
    series = _SeriesData(
        "s", np.array([2.0, 0.0, 1.0, 0.0, 2.0]), np.array([20.0, 0.0, 13.0, 0.0, 30.0])
    )
    # Mean training price: amount / units over the window (Table 21 sensitivity).
    assert mean_training_prices(series, [1, 3], window=2) == {1: 10.0, 3: 13.0}
    assert mean_training_prices(series, [4], window=5) == {4: 63.0 / 5.0}
    # Price known at the origin: the latest period with sales in the window (primary).
    assert last_known_prices(series, [1, 3, 4], window=5) == {1: 10.0, 3: 13.0, 4: 15.0}
    assert last_known_prices(series, [3], window=1) == {}
    unsold = _SeriesData("u", np.zeros(3), np.zeros(3))
    assert mean_training_prices(unsold, [1, 2], window=2) == {}
    assert last_known_prices(unsold, [1, 2], window=2) == {}


@given(
    st.lists(st.integers(min_value=0, max_value=20), min_size=3, max_size=25),
    st.floats(min_value=0.0, max_value=3.0),
    st.integers(min_value=1, max_value=3),
)
def test_stock_balance_holds(values: list[int], multiplier: float, lead_time: int) -> None:
    demand = np.array(values, dtype=np.float64)
    origins = list(range(len(values) - 1))
    forecasts = {o: float(np.mean(demand[: o + 1])) * (1 + lead_time) for o in origins}
    sigmas = {o: protection_sigma(demand[: o + 1], 1 + lead_time) for o in origins}
    result = simulate(
        demand, origins, forecasts, sigmas, multiplier=multiplier, lead_time=lead_time
    )
    assert math.isclose(result.served + result.lost, float(demand[1:].sum()))
    assert result.served >= 0
    assert result.lost >= 0
    assert result.mean_on_hand >= 0
    assert 0.0 <= result.fill_rate <= 1.0
