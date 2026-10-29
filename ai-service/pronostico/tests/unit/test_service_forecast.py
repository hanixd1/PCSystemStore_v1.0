"""Production service (F11): probabilities and the statistical fallback."""

import numpy as np

from pcsforecast.service.forecast import (
    WEB_CATEGORY_MAP,
    StatisticalQuantiles,
    probability_at_least,
    reliability,
    tsb_probability,
)

QUANTILES = np.array([10, 20, 30, 40, 50, 60, 70, 80, 90], dtype=float)


def test_probability_inside_the_band_is_interpolated() -> None:
    probability, bound = probability_at_least(QUANTILES, 50.5)
    assert bound == "within"
    assert abs(probability - 0.5) < 1e-9


def test_probability_outside_the_band_is_only_a_bound() -> None:
    assert probability_at_least(QUANTILES, 5) == (0.9, "above")
    assert probability_at_least(QUANTILES, 500) == (0.1, "below")
    assert probability_at_least(QUANTILES, 0) == (1.0, "within")


def test_tsb_probability_tracks_recent_sales() -> None:
    never = tsb_probability(np.zeros(12))
    recent = tsb_probability(np.array([0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1], dtype=float))
    old = tsb_probability(np.array([1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0], dtype=float))
    assert never == (0.0, 0.0)
    assert recent[0] > old[0]


def test_statistical_fallback_is_monotone_and_widens_with_horizon() -> None:
    values = StatisticalQuantiles().quantiles([np.array([5, 8, 6, 9, 7, 10, 6, 8], dtype=float)], 6)
    assert values.shape == (1, 6, 9)
    assert (np.diff(values, axis=-1) >= 0).all()
    assert values[0, -1, -1] - values[0, -1, 0] >= values[0, 0, -1] - values[0, 0, 0]


def test_reliability_follows_the_validated_horizons() -> None:
    assert [reliability(h) for h in (1, 3, 4)] == ["validated", "sensitivity", "extrapolation"]


def test_web_categories_are_grouped_into_thesis_categories() -> None:
    assert WEB_CATEGORY_MAP["KEYBOARD"] == WEB_CATEGORY_MAP["MOUSE"] == "keyboard_mouse"
    assert WEB_CATEGORY_MAP["RAM"] == "memory"
    assert WEB_CATEGORY_MAP["CHAIR"] == "accessory"
    assert {WEB_CATEGORY_MAP[c] for c in ("LAPTOP", "PC_DESKTOP", "GAMING_DESK", "SOFTWARE")} == {
        "other"
    }
