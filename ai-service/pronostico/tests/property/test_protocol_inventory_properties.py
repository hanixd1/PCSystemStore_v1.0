"""Invariants of the temporal protocol and the inventory simulator (quality plan, section 5).

* No value after the origin reaches a model, whatever the series, origin and window.
* Validation origins keep every target inside the development periods.
* The simulator conserves demand (served + lost), never serves more than is demanded, never
  holds negative stock and orders whole non-negative quantities.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from hypothesis import given
from hypothesis import strategies as st

from pcsforecast.config import FrequencyProtocol, Window
from pcsforecast.inventory.simulator import simulate
from pcsforecast.protocol.origins import TrainView, validation_origins

counts = st.lists(st.integers(min_value=0, max_value=50), min_size=2, max_size=60)


@st.composite
def series_and_origin(draw: st.DrawFn) -> tuple[np.ndarray, int, str, int]:
    values = np.array(draw(counts), dtype=np.float64)
    origin = draw(st.integers(min_value=0, max_value=values.size - 1))
    window = draw(st.sampled_from(["rolling", "expanding"]))
    length = draw(st.integers(min_value=1, max_value=values.size))
    return values, origin, window, length


@given(series_and_origin(), st.integers(min_value=1, max_value=99))
def test_train_view_never_exposes_values_after_the_origin(
    case: tuple[np.ndarray, int, str, int], noise: int
) -> None:
    values, origin, window, length = case
    view = TrainView.at(values, origin, window, length).history
    start = max(0, origin + 1 - length) if window == "rolling" else 0
    assert view.tolist() == values[start : origin + 1].tolist()
    assert view[-1] == values[origin]
    changed_future = values.copy()
    changed_future[origin + 1 :] += noise
    again = TrainView.at(changed_future, origin, window, length).history
    assert again.tolist() == view.tolist()
    assert not view.flags.writeable


@given(
    st.integers(min_value=2, max_value=80),
    st.integers(min_value=1, max_value=30),
    st.lists(st.integers(min_value=1, max_value=6), min_size=1, max_size=3, unique=True),
    st.integers(min_value=1, max_value=4),
)
def test_validation_origins_keep_targets_inside_development(
    periods: int, minimum: int, horizons: list[int], step: int
) -> None:
    protocol = FrequencyProtocol(
        min_train_periods=minimum,
        horizons=horizons,
        origin_step=step,
        window=Window(primary="rolling", length=minimum),
    )
    for origin in validation_origins(periods, protocol):
        assert origin.position >= minimum - 1
        assert origin.horizons
        assert all(origin.position + h < periods for h in origin.horizons)


@dataclass(frozen=True)
class SimulationCase:
    demand: np.ndarray
    origins: list[int]
    forecasts: dict[int, float]
    sigmas: dict[int, float]
    multiplier: float
    lead_time: int


@st.composite
def simulation_case(draw: st.DrawFn) -> SimulationCase:
    demand = np.array(draw(st.lists(st.integers(0, 20), min_size=4, max_size=40)), dtype=float)
    first = draw(st.integers(min_value=0, max_value=demand.size - 3))
    last = draw(st.integers(min_value=first, max_value=demand.size - 2))
    origins = list(range(first, last + 1))
    level = st.floats(min_value=0.0, max_value=30.0, allow_nan=False)
    return SimulationCase(
        demand=demand,
        origins=origins,
        forecasts={o: draw(level) for o in origins},
        sigmas={o: draw(level) for o in origins},
        multiplier=draw(st.floats(min_value=0.0, max_value=3.0, allow_nan=False)),
        lead_time=draw(st.integers(min_value=1, max_value=3)),
    )


@given(simulation_case())
def test_simulation_conserves_demand_and_stock(case: SimulationCase) -> None:
    result = simulate(
        case.demand,
        case.origins,
        case.forecasts,
        case.sigmas,
        multiplier=case.multiplier,
        lead_time=case.lead_time,
    )
    served_periods = case.demand[case.origins[0] + 1 : case.origins[-1] + 2]
    assert result.periods == served_periods.size
    assert result.demand == served_periods.sum()
    assert result.served + result.lost == result.demand
    assert 0.0 <= result.served <= result.demand
    assert result.lost >= 0.0
    assert 0.0 <= result.fill_rate <= 1.0
    assert result.mean_on_hand >= 0.0
    assert result.mean_safety_stock >= 0.0
    assert 0 <= result.orders <= len(case.origins)
