"""F3 step: internal-validation run on the development span, logged as an experiment.

The same step evaluates the final test (F9) and its rehearsal when it is given an
``Evaluation``: only the panel, the origins and the record change.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import pandas as pd

from pcsforecast import __version__
from pcsforecast.config import FrequencyProtocol, ModelsConfig, ProtocolConfig, file_sha256
from pcsforecast.evaluation.metrics import summarise
from pcsforecast.final_test.panel import Evaluation, evaluated_panel
from pcsforecast.models.base import AnyForecaster
from pcsforecast.models.registry import build_models, pretrained_versions
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.stages import run_mode
from pcsforecast.runner.engine import run_engine
from pcsforecast.runtime import environment_fingerprint, peak_memory_mb
from pcsforecast.tuning.run import tuned_inputs, tuned_params

Frequency = Literal["weekly", "monthly"]
Condition = Literal["full", "truncated", "expanding"]


class RunInputError(RuntimeError):
    """The series differ from what the series step handed over."""


def evaluated_protocol(protocol: FrequencyProtocol, condition: Condition) -> FrequencyProtocol:
    """Protocol of the main horizons with the training window of the condition."""
    window = protocol.window
    if condition == "truncated":
        if protocol.truncated_length is None:
            raise RunInputError("no truncated_length in protocol.yaml")
        window = window.model_copy(update={"length": protocol.truncated_length})
    elif condition == "expanding":
        if window.contrast is None:
            raise RunInputError("no contrast window in protocol.yaml")
        window = window.model_copy(update={"primary": window.contrast})
    return protocol.model_copy(update={"window": window})


def sensitivity_protocol(protocol: FrequencyProtocol) -> FrequencyProtocol | None:
    """Protocol of the sensitivity horizons alone (Table 17: 3 months for the monthly series).

    They run in a separate pass with fresh models: models trained for the longest horizon they
    are asked for (direct multi-horizon gradient boosting, Chronos fine-tuning) would otherwise
    change their main-horizon forecasts when a sensitivity horizon is added.
    """
    extra = sorted(set(protocol.sensitivity_horizons) - set(protocol.horizons))
    return protocol.model_copy(update={"horizons": extra}) if extra else None


def close_models(models: Sequence[AnyForecaster]) -> None:
    """Stop worker processes (Chronos) so that their peak memory is counted in the record."""
    for model in models:
        close = getattr(model, "close", None)
        if callable(close):
            close()


def model_details(models: Sequence[AnyForecaster]) -> dict[str, object]:
    """What models report about their own fitting (for example each Chronos refit)."""
    details: dict[str, object] = {}
    for model in models:
        report = getattr(model, "details", None)
        if callable(report):
            details[model.name] = report()
    return details


def run_validation(
    paths: ProjectPaths,
    frequency: Frequency,
    protocol: ProtocolConfig,
    models_config: ModelsConfig,
    *,
    run_id: str | None = None,
    condition: Condition = "full",
    evaluation: Evaluation | None = None,
) -> Path:
    """Evaluate every implemented model on the selected series of one frequency.

    ``condition="truncated"`` shortens the rolling window to the protocol's
    ``truncated_length`` (HE3, truncated history); ``condition="expanding"`` uses the contrast
    window of Table 17 (all history up to the origin). Origins and horizons are unchanged.

    With ``evaluation`` the run covers the origins of the final test (or its rehearsal) on the
    evaluation's panel instead of the internal-validation origins.
    """
    panel, panel_inputs, stage = evaluated_panel(paths, evaluation, RunInputError)
    profile = pd.read_parquet(paths.series / "profile.parquet")
    selected = profile[(profile["frequency"] == frequency) & profile["selected"]]
    model_set = build_models(models_config, frequency, tuned_params(paths, frequency))
    frequency_protocol = protocol.frequencies[frequency]
    frequency_protocol = evaluated_protocol(frequency_protocol, condition)
    started = datetime.now(UTC)
    frequency_panel = panel[panel["frequency"] == frequency]
    series_ids = selected["series_id"].tolist()
    origins = None if evaluation is None else evaluation.origins(frequency, frequency_protocol)
    engine = run_engine(frequency_panel, series_ids, model_set.models, frequency_protocol, origins)
    close_models(model_set.models)
    predictions = engine.predictions
    sensitivity: dict[str, object] = {}
    extra_protocol = sensitivity_protocol(frequency_protocol)
    if extra_protocol is not None:
        extra_models = build_models(models_config, frequency, tuned_params(paths, frequency))
        extra_origins = (
            None if evaluation is None else evaluation.origins(frequency, extra_protocol)
        )
        extra = run_engine(
            frequency_panel, series_ids, extra_models.models, extra_protocol, extra_origins
        )
        close_models(extra_models.models)
        predictions = pd.concat([predictions, extra.predictions], ignore_index=True)
        sensitivity = {
            "horizons": extra_protocol.horizons,
            "seconds_by_model": {k: round(v, 3) for k, v in extra.seconds_by_model.items()},
            "seconds_by_stage": extra.seconds_by_stage,
            "model_details": model_details(extra_models.models),
            "failures": extra.failures,
        }
    finished = datetime.now(UTC)
    predictions = predictions.assign(frequency=frequency)
    metrics = summarise(predictions)
    levels = selected.set_index("series_id")[["channel", "level", "key", "pattern"]]
    metrics = metrics.join(levels, on="series_id")

    base = "validation" if evaluation is None else stage
    suffix = base if condition == "full" else f"{base}-{condition}"
    run_id = run_id or f"{started:%Y%m%dT%H%M%SZ}-{frequency}-{suffix}"
    out = paths.runs / run_id
    out.mkdir(parents=True, exist_ok=False)
    predictions.to_parquet(out / "predictions.parquet", index=False)
    metrics.to_parquet(out / "metrics.parquet", index=False)
    record = {
        "run_id": run_id,
        "mode": run_mode("validation", stage),
        "condition": condition,
        "frequency": frequency,
        "window": frequency_protocol.window.model_dump(),
        "horizons": frequency_protocol.horizons,
        "sensitivity_horizons": protocol.frequencies[frequency].sensitivity_horizons,
        "min_train_periods": frequency_protocol.min_train_periods,
        "package_version": __version__,
        "started_at": started.isoformat(timespec="seconds"),
        "finished_at": finished.isoformat(timespec="seconds"),
        "inputs": {
            **panel_inputs,
            "protocol.yaml": file_sha256(paths.configs / "protocol.yaml"),
            "models.yaml": file_sha256(paths.configs / "models.yaml"),
            **tuned_inputs(paths),
        },
        "series": int(selected["series_id"].nunique()),
        "series_by_level": {
            str(k): int(v) for k, v in selected["level"].value_counts().sort_index().items()
        },
        "series_by_channel": {
            str(k): int(v) for k, v in selected["channel"].value_counts().sort_index().items()
        },
        "origins": int(predictions["origin"].nunique()) if not predictions.empty else 0,
        "models": [m.name for m in model_set.models],
        "not_implemented": list(model_set.not_implemented),
        "params": model_set.params,
        "pretrained": pretrained_versions(models_config),
        "model_details": model_details(model_set.models),
        "seconds_by_model": {k: round(v, 3) for k, v in engine.seconds_by_model.items()},
        "seconds_by_stage": engine.seconds_by_stage,
        "failures": engine.failures,
        "sensitivity_pass": sensitivity,
        "test_span_used": evaluation is not None and evaluation.test_span_used,
        **({} if evaluation is None else evaluation.record()),
        "peak_memory_mb": peak_memory_mb(),
        "environment": environment_fingerprint(),
    }
    (out / "run.json").write_text(
        json.dumps(record, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8"
    )
    return out
