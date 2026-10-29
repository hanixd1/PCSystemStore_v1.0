"""Light fine-tuning of Chronos on the full monthly history, for the production service.

Same frozen settings as the thesis (models.yaml, monthly): AdamW on the quantile loss, the last
month of every history reserved for early stopping, the best checked step kept. The weights are
saved under ``models_cache/service/chronos_fine_tuned`` and the ai-service loads them on start.

Run it whenever the series are rebuilt with new months:

    python -m pcsforecast.service.fit

It runs in its own process on purpose: PyTorch must not share a process with LightGBM (ADR-0009),
which the ``pcs`` CLI imports.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from pcsforecast.models.foundation import FineTuneSettings, fine_tune, load_chronos
from pcsforecast.paths import project_paths
from pcsforecast.service.data import CONTEXT_MONTHS, load_series
from pcsforecast.service.forecast import CHRONOS_REPO, CHRONOS_REVISION, TUNED_DIRNAME

# models.yaml, chronos_fine_tuned, monthly.
SETTINGS = FineTuneSettings(
    learning_rate=1e-5,
    max_steps=1000,
    train_batch=32,
    eval_every=25,
    patience=4,
    min_context=6,
    seed=20261024,
)
HORIZON = 1
LEVELS = ("total", "category", "sku")


def _relative_to_root(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix() if path.is_relative_to(root) else path.name


def fit_service_model(root: Path | None = None) -> dict[str, float]:
    paths = project_paths(root)
    os.environ.setdefault("HF_HOME", str(paths.models_cache))
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    store = load_series(paths)
    histories = {
        f"{level}:{key}": values
        for level in LEVELS
        for key, values in store.histories(level, context=CONTEXT_MONTHS).items()
        if values.sum() > 0
    }
    started = time.perf_counter()
    pipeline = load_chronos(CHRONOS_REPO, CHRONOS_REVISION)
    tuned, report = fine_tune(pipeline, histories, HORIZON, SETTINGS)
    target = paths.models_cache / TUNED_DIRNAME
    target.mkdir(parents=True, exist_ok=True)
    tuned.model.save_pretrained(str(target))
    report = {
        **report,
        "series": float(len(histories)),
        "total_seconds": time.perf_counter() - started,
    }
    (target / "service_fit.json").write_text(
        json.dumps(
            {
                "fitted_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "last_month": store.last_month.strftime("%Y-%m"),
                # Relative to the project: an absolute path would leak the machine's layout.
                "series_source": _relative_to_root(store.source, paths.root),
                "context_months": CONTEXT_MONTHS,
                "base": {"repo": CHRONOS_REPO, "revision": CHRONOS_REVISION},
                "report": report,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return report


if __name__ == "__main__":  # pragma: no cover
    print(json.dumps(fit_service_model(), indent=2))
