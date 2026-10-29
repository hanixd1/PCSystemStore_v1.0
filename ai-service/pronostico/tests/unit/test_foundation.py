from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from pcsforecast.config import ModelsConfig
from pcsforecast.models import registry
from pcsforecast.models.foundation import (
    ChronosFineTuned,
    ChronosZeroShot,
    FineTuneSettings,
    training_windows,
)


class FakeQuantiles:
    """Mimics ``predict_quantiles``: median = last value minus one, per step."""

    def __init__(self) -> None:
        self.calls: list[int] = []

    def predict_quantiles(
        self, contexts: list[Any], prediction_length: int, quantile_levels: list[float]
    ) -> tuple[np.ndarray, None]:
        self.calls.append(len(contexts))
        assert quantile_levels == [0.5]
        last = np.array([float(c[-1]) for c in contexts])
        steps = np.arange(1, prediction_length + 1)
        return (last[:, None] - steps[None, :])[..., None], None


def test_chronos_batches_series_and_clips_at_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeQuantiles()
    loads: list[tuple[str, str]] = []

    def loader(repo: str, revision: str) -> FakeQuantiles:
        loads.append((repo, revision))
        return fake

    model = ChronosZeroShot("org/model", "abc123", batch_size=2, loader=loader, convert=np.asarray)
    histories = {f"s{i}": np.array([0.0, float(i)]) for i in range(5)}
    forecasts = model.forecast_panel(histories, 3)
    model.forecast_panel(histories, 1)
    assert loads == [("org/model", "abc123")]  # loaded once
    assert fake.calls == [2, 2, 1, 2, 2, 1]
    assert forecasts["s4"].tolist() == [3.0, 2.0, 1.0]
    assert forecasts["s1"].tolist() == [0.0, 0.0, 0.0]
    assert (model.name, model.family) == ("chronos_zero_shot", "pretrained")
    with pytest.raises(ValueError, match="non-negative"):
        model.forecast_panel({"bad": np.array([-1.0])}, 1)
    model.close()  # no worker was started


def config(revision: str | None) -> ModelsConfig:
    return ModelsConfig.model_validate(
        {
            "status": "draft",
            "families": {
                "baseline": [{"name": "naive"}],
                "pretrained": [
                    {"name": "chronos_zero_shot", "hf_repo": "org/m", "hf_revision": revision},
                    {
                        "name": "chronos_fine_tuned",
                        "hf_repo": "org/m",
                        "hf_revision": revision,
                        "params": {"max_steps": 7, "refit_every": 1},
                        "params_by_frequency": {"weekly": {"refit_every": 13}},
                    },
                    {"name": "chronos_large", "hf_repo": "org/m", "hf_revision": revision},
                ],
            },
        }
    )


def test_registry_builds_chronos_only_when_pinned_and_installed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(registry, "foundation_available", lambda: True)
    built = registry.build_models(config("abc"), "weekly")
    assert [m.name for m in built.models] == ["naive", "chronos_zero_shot", "chronos_fine_tuned"]
    assert built.not_implemented == ("chronos_large",)
    tuned = built.models[2]
    assert isinstance(tuned, ChronosFineTuned)
    assert (tuned.refit_every, tuned.settings.max_steps) == (13, 7)
    monthly = registry.build_models(config("abc"), "monthly").models[2]
    assert isinstance(monthly, ChronosFineTuned)
    assert monthly.refit_every == 1
    assert registry.build_models(config(None)).not_implemented == (
        "chronos_zero_shot",
        "chronos_fine_tuned",
        "chronos_large",
    )
    monkeypatch.setattr(registry, "foundation_available", lambda: False)
    assert "chronos_zero_shot" in registry.build_models(config("abc")).not_implemented


def test_foundation_detection() -> None:
    from importlib import reload  # noqa: PLC0415

    fresh = reload(registry)
    assert isinstance(fresh.foundation_available(), bool)


def test_training_windows_reserve_the_last_periods_and_skip_constant_contexts() -> None:
    histories = {
        "a": np.array([0.0, 1.0, 0.0, 2.0, 0.0, 3.0, 1.0, 0.0]),
        "flat": np.zeros(8),
        "short": np.array([1.0, 2.0]),
    }
    train, reserve = training_windows(histories, horizon=2, min_context=3)
    # "a": contexts end at 3 and 4 (targets end before the 2-period reserve); "flat" never
    # varies; "short" is shorter than the minimum context plus the reserve.
    assert len(train) == 2
    assert len(reserve) == 1
    assert reserve.targets.tolist() == [[1.0, 0.0]]
    assert np.isnan(reserve.contexts[0, :2]).all()  # left-padded to the longest history
    assert reserve.contexts[0, 2:].tolist() == [0.0, 1.0, 0.0, 2.0, 0.0, 3.0]
    assert train.targets.tolist() == [[2.0, 0.0], [0.0, 3.0]]
    empty, none = training_windows({"flat": np.zeros(8)}, horizon=2, min_context=3)
    assert len(empty) == len(none) == 0


class FakeTuner:
    def __init__(self) -> None:
        self.seen: list[int] = []

    def __call__(
        self,
        pipeline: Any,
        histories: Mapping[str, np.ndarray],
        horizon: int,
        settings: FineTuneSettings,
    ) -> tuple[Any, dict[str, float]]:
        self.seen.append(next(iter(histories.values())).size)
        return FakeQuantiles(), {"steps": 3.0, "best_step": 2.0, "horizon": float(horizon)}


def test_fine_tuned_chronos_refits_every_k_origins_with_that_origins_histories() -> None:
    tuner = FakeTuner()
    model = ChronosFineTuned(
        "org/model",
        "abc123",
        loader=lambda repo, revision: FakeQuantiles(),
        convert=np.asarray,
        settings=FineTuneSettings(max_steps=3),
        refit_every=2,
        tuner=tuner,
    )
    for size in range(3, 8):  # five origins, histories growing as in an expanding window
        forecasts = model.forecast_panel({"s": np.arange(size, dtype=float)}, 1)
    assert tuner.seen == [3, 5, 7]  # refits at origins 0, 2 and 4
    assert forecasts["s"].tolist() == [5.0]
    details = model.details()
    assert details["refit_every"] == 2
    assert [r["call"] for r in model.refits] == [0, 2, 4]
    assert model.fit_seconds == 0.0  # the fake tuner reports no seconds
    assert (model.name, model.family) == ("chronos_fine_tuned", "pretrained")
    with pytest.raises(ValueError, match="non-negative"):
        model.forecast_panel({"bad": np.array([-1.0])}, 1)


def test_zero_shot_pipeline_is_not_loaded_in_the_main_process_without_a_loader() -> None:
    model = ChronosZeroShot("org/model", "abc123")
    with pytest.raises(RuntimeError, match="worker"):
        model._base_pipeline()


CHECK_SCRIPT = Path(__file__).with_name("chronos_fine_tune_check.py")


def test_fine_tune_keeps_the_best_checked_step_and_leaves_the_input_untouched(
    tmp_path: Path,
) -> None:
    """Real fine-tuning of a tiny random Chronos-Bolt, in its own process (ADR-0009)."""
    if not all(importlib.util.find_spec(m) for m in registry.FOUNDATION_MODULES):
        pytest.skip("the foundation extra is not installed")  # never import torch here
    report_path = tmp_path / "report.json"
    command = [sys.executable, str(CHECK_SCRIPT), str(report_path)]
    subprocess.run(command, check=True)  # noqa: S603 (fixed interpreter and test script)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    trained = report["trained"]
    assert report["new_pipeline"]
    assert report["input_untouched"]
    assert trained["validation_windows"] == 12
    assert 0 < trained["steps"] <= 20
    assert trained["best_validation_loss"] <= trained["initial_validation_loss"]
    assert report["repeat_loss"] == trained["best_validation_loss"]  # seeded
    assert report["stalled"]["best_step"] == 0  # no improvement: zero-shot weights kept
    assert report["stalled"]["steps"] == 10
    assert report["nothing_to_learn"] == {"same_pipeline": True, "steps": 0}
    assert report["median_shape"] == [1, 2]
    assert report["medians_non_negative"]
