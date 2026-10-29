"""Real fine-tuning check, run by test_foundation.py in a separate process.

PyTorch cannot be imported into a test process where LightGBM has already started its OpenMP
runtime (ADR-0009), so the check runs here and writes a JSON report for the test to assert on.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from chronos.chronos_bolt import ChronosBoltModelForForecasting, ChronosBoltPipeline
from transformers import T5Config

from pcsforecast.models.foundation import FineTuneSettings, fine_tune, predict_median


def tiny_bolt() -> ChronosBoltPipeline:
    """A randomly initialised Chronos-Bolt small enough for a test (no download)."""
    config = T5Config(  # type: ignore[call-arg]
        d_model=16,
        d_ff=32,
        d_kv=8,
        num_heads=2,
        num_layers=1,
        num_decoder_layers=1,
        dropout_rate=0.0,
        vocab_size=2,
        pad_token_id=0,
        decoder_start_token_id=0,
        chronos_config={
            "context_length": 64,
            "prediction_length": 8,
            "input_patch_size": 4,
            "input_patch_stride": 4,
            "quantiles": [0.1, 0.5, 0.9],
            "use_reg_token": True,
        },
    )
    return ChronosBoltPipeline(ChronosBoltModelForForecasting(config))


def main(report_path: Path) -> None:
    pipeline = tiny_bolt()
    rng = np.random.default_rng(0)
    histories = {f"s{i}": rng.poisson(2.0, 24).astype(float) for i in range(12)}
    before = {k: v.clone() for k, v in pipeline.model.state_dict().items()}
    settings = FineTuneSettings(
        learning_rate=1e-2, max_steps=20, train_batch=8, eval_every=5, patience=2, min_context=8
    )
    tuned, trained = fine_tune(pipeline, histories, 2, settings)
    _, repeat = fine_tune(pipeline, histories, 2, settings)
    stalled_settings = FineTuneSettings(
        learning_rate=0.0, max_steps=50, eval_every=5, patience=2, min_context=8
    )
    _, stalled = fine_tune(pipeline, histories, 2, stalled_settings)
    same, nothing = fine_tune(pipeline, {"flat": np.zeros(24)}, 2, settings)
    medians = predict_median(tuned, [histories["s0"]], 2)
    report = {
        "new_pipeline": tuned is not pipeline,
        "input_untouched": all(
            bool((v == before[k]).all()) for k, v in pipeline.model.state_dict().items()
        ),
        "trained": trained,
        "repeat_loss": repeat["best_validation_loss"],
        "stalled": stalled,
        "nothing_to_learn": {"same_pipeline": same is pipeline, "steps": nothing["steps"]},
        "median_shape": list(medians.shape),
        "medians_non_negative": bool((medians >= 0).all()),
    }
    report_path.write_text(json.dumps(report), encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
