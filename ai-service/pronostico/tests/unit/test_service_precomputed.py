"""Production service (F11): Chronos quantiles precomputed offline and served without PyTorch."""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pcsforecast.paths import project_paths
from pcsforecast.service.data import SERVICE_SERIES_ENV, load_series
from pcsforecast.service.forecast import ForecastEngine, StatisticalQuantiles
from pcsforecast.service.precomputed import (
    PRECOMPUTED_FILE,
    export_precomputed,
    load_precomputed,
)
from pcsforecast.service.synthetic import write_synthetic_project


@pytest.fixture
def root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.delenv(SERVICE_SERIES_ENV, raising=False)
    write_synthetic_project(tmp_path)
    return tmp_path


def test_precomputed_forecasts_equal_the_live_model(root: Path) -> None:
    export_precomputed(root, model=StatisticalQuantiles())
    store = load_series(project_paths(root))
    precomputed = load_precomputed(store)
    assert precomputed is not None
    assert precomputed.name == "ses"

    month = store.last_month + pd.DateOffset(months=1)
    live = ForecastEngine(store, StatisticalQuantiles()).month_forecast(month)
    served = ForecastEngine(store, precomputed).month_forecast(month)
    assert served["total"]["median"] == pytest.approx(live["total"]["median"], abs=1e-3)
    assert [c["key"] for c in served["categories"]] == [c["key"] for c in live["categories"]]


def test_stale_or_broken_files_fall_back_to_the_live_model(root: Path) -> None:
    target = export_precomputed(root, model=StatisticalQuantiles())
    store = load_series(project_paths(root))
    document = json.loads(target.read_text(encoding="utf-8"))

    document["last_month"] = "2020-01"
    target.write_text(json.dumps(document), encoding="utf-8")
    assert load_precomputed(store) is None

    target.write_text("{no es json", encoding="utf-8")
    assert load_precomputed(store) is None

    (store.source / PRECOMPUTED_FILE).unlink()
    assert load_precomputed(store) is None


def test_wrong_shapes_are_rejected(root: Path) -> None:
    target = export_precomputed(root, model=StatisticalQuantiles())
    document = json.loads(target.read_text(encoding="utf-8"))
    document["levels"]["total"]["ALL"] = np.zeros((2, 2)).tolist()
    target.write_text(json.dumps(document), encoding="utf-8")
    assert load_precomputed(load_series(project_paths(root))) is None
