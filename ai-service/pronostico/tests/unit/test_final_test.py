"""Final-test origins, inventory spans, rehearsal windows and the opening record."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from pcsforecast.config import FrequencyProtocol
from pcsforecast.final_test.panel import FinalTestError, inventory_spans, rehearsal_windows
from pcsforecast.final_test.run import close_test, open_test, run_final_test
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.origins import Origin, final_test_origins
from pcsforecast.protocol.stages import run_mode
from pcsforecast.protocol.windows import Windows
from pcsforecast.reporting.figures import cliques, decimal
from pcsforecast.reporting.thesis import shapiro

LABELS = ["development"] * 6 + ["excluded"] + ["test"] * 3 + ["excluded"]


def _protocol(horizons: list[int]) -> FrequencyProtocol:
    return FrequencyProtocol.model_validate(
        {
            "min_train_periods": 3,
            "horizons": horizons,
            "origin_step": 1,
            "window": {"primary": "rolling", "length": 3, "contrast": "expanding"},
        }
    )


def test_test_origins_cover_only_test_targets() -> None:
    origins = final_test_origins(LABELS, _protocol([1, 2]))
    assert origins == [
        Origin(5, (2,)),  # its 1-step target is the excluded boundary period
        Origin(6, (1, 2)),
        Origin(7, (1, 2)),
        Origin(8, (1,)),  # its 2-step target is after the test
    ]
    targets = {o.position + h for o in origins for h in o.horizons}
    assert targets == {7, 8, 9}


def test_inventory_spans_calibrate_on_development_and_serve_the_test() -> None:
    calibration, evaluation = inventory_spans(LABELS, _protocol([1]))
    assert calibration == [2, 3, 4]  # serve development periods 3..5
    assert evaluation == [6, 7, 8]  # serve test periods 7..9
    only_development, protocol = ["development"] * 5, _protocol([1])
    with pytest.raises(FinalTestError, match="no development or no test"):
        inventory_spans(only_development, protocol)


def test_rehearsal_window_is_the_end_of_development() -> None:
    windows = Windows(date(2024, 1, 3), date(2026, 9, 14), date(2026, 3, 1), date(2026, 8, 31))
    stand_in = rehearsal_windows(windows, 6)
    assert (stand_in.test_start, stand_in.test_end) == (date(2025, 9, 1), date(2026, 2, 28))


def test_run_modes() -> None:
    assert run_mode("validation", "development") == "internal_validation"
    assert run_mode("inventory", "test") == "final_test_inventory"


def test_opening_record_and_refusals(tmp_path: Path) -> None:
    paths = ProjectPaths(tmp_path)
    with pytest.raises(FinalTestError, match="unknown"):
        run_final_test(paths, "development")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "HEAD").write_text("abc\n")
    opening = open_test(paths, "abc")
    close_test(opening, None, "RuntimeError('boom')")
    reopened = open_test(paths, "abc")  # an interrupted opening may be retried, and is recorded
    assert reopened == opening
    text = opening.read_text(encoding="utf-8")
    assert "boom" in text
    assert text.count('"commit": "abc"') == 2


def test_shapiro_needs_spread_and_enough_values() -> None:
    assert shapiro(pd.Series([1.0, 2.0])) is None
    assert shapiro(pd.Series([1.0, 1.0, 1.0, float("inf")])) is None
    result = shapiro(pd.Series([0.1, 0.4, 0.2, 0.9, 0.5, 0.3]))
    assert result is not None
    assert 0 < result[0] <= 1


def test_cliques_join_models_closer_than_the_critical_difference() -> None:
    assert cliques([1.0, 1.5, 2.2, 5.0, 5.4], 1.3) == [(0, 2), (3, 4)]
    assert cliques([1.0, 3.0, 5.0], 1.0) == []
    assert decimal(0.951) == "0,95"
