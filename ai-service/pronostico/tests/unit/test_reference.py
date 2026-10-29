from __future__ import annotations

import numpy as np
import pytest

from pcsforecast.models.statistical import TSB, Croston, ses_level
from pcsforecast.reference.crosscheck import (
    MUST_MATCH,
    ReferenceInputError,
    build_cases,
    compare,
    own_forecasts,
    selected_alpha,
)


def windows() -> list[np.ndarray]:
    rng = np.random.default_rng(3)
    return [rng.poisson(1.0, size).astype(float) for size in (8, 12, 12, 20)] + [np.zeros(8)]


def test_cases_keep_each_window_and_the_selected_alpha() -> None:
    data = windows()
    cases = build_cases(data, {"alpha_d": 0.2})
    assert len(cases) == 5
    assert cases.histories.shape == (5, 20)
    assert cases.history(0).tolist() == data[0].tolist()
    assert cases.history(3).tolist() == data[3].tolist()
    assert (cases.tsb_alpha_d, cases.tsb_alpha_p) == (0.2, 0.1)
    assert cases.ses_alpha[1] == selected_alpha(data[1])


def test_own_forecasts_use_the_reference_parameters() -> None:
    data = windows()
    cases = build_cases(data, {"alpha_d": 0.2, "alpha_p": 0.3})
    own = own_forecasts(cases)
    assert set(own) == {*MUST_MATCH, "tsb_declared"}
    assert own["naive"][1] == data[1][-1]
    assert own["croston"][2] == Croston(alpha=0.1).forecast(data[2], 1)[0]
    assert own["ses"][3] == pytest.approx(ses_level(data[3], cases.ses_alpha[3])[0])
    first = TSB(alpha_d=0.2, alpha_p=0.3, probability_init="first").forecast(data[3], 1)[0]
    assert own["tsb"][3] == first
    assert own["tsb_declared"][3] == TSB(alpha_d=0.2, alpha_p=0.3).forecast(data[3], 1)[0]
    assert own["sba"][4] == 0.0


def test_compare_flags_methods_that_disagree() -> None:
    own = own_forecasts(build_cases(windows(), {}))
    reference = {name: values.copy() for name, values in own.items() if name != "tsb_declared"}
    table = compare(own, reference).set_index("method")
    assert table.loc[list(MUST_MATCH), "agrees"].all()
    reference["croston"] = reference["croston"] + 1e-3
    table = compare(own, reference).set_index("method")
    assert not table.loc["croston", "agrees"]
    assert table.loc["croston", "max_abs_difference"] == pytest.approx(1e-3)
    with pytest.raises(ReferenceInputError, match="reference"):
        compare(own, {**reference, "naive": np.zeros(2)})
