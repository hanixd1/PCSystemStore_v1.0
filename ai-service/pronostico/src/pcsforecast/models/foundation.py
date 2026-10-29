"""Pretrained time-series foundation model: zero-shot and light fine-tuning (plan Table 20).

Zero-shot: Chronos-Bolt forecasts every series of one origin in a single batch from its history
up to the origin; no parameter is fitted on the company's data. The point forecast is the median
(quantile 0.5), clipped at zero. The weights are pinned to a Hugging Face revision so that every
run uses the same model (Ansari et al., 2024); they are cached under ``HF_HOME``
(``models_cache/``).

Light fine-tuning ("ajuste ligero"): a copy of the same weights is trained on windows of the
training histories, with the last periods of every history reserved as internal validation; the
step with the lowest validation loss is kept (early stopping), so the fine-tuned model is never
worse than the zero-shot weights on the reserve (Li et al., 2025). It is refitted every
``refit_every`` origins with the histories available at that origin only, and forecasts the
origins in between with the latest fit.

PyTorch and ``chronos-forecasting`` are optional (``uv sync --extra foundation``): the models are
built only when they are configured, and the pipeline is loaded on first use.

Chronos runs in a separate worker process (started with ``spawn``). PyTorch ships its own OpenMP
runtime; loading it into a process where LightGBM has already started another one aborts on macOS
("OMP: Error #15"), and the documented workaround may silently corrupt results. Separate processes
keep the two runtimes apart on every platform.
"""

from __future__ import annotations

import copy
import multiprocessing
import time
from collections.abc import Callable, Mapping
from concurrent.futures import ProcessPoolExecutor
from dataclasses import asdict, dataclass, field
from typing import Any

import numpy as np

from pcsforecast.models.base import FloatArray, check_history

MEDIAN = 0.5
EVAL_BATCH = 256
WEIGHT_DECAY = 0.01  # AdamW's default, stated explicitly
Pipeline = Any  # chronos.BaseChronosPipeline; untyped third-party object


def load_chronos(repo: str, revision: str) -> Pipeline:
    """Chronos pipeline on CPU in float32 (deterministic for Chronos-Bolt)."""
    import torch  # noqa: PLC0415 (optional heavy dependency)
    from chronos import BaseChronosPipeline  # noqa: PLC0415

    torch.manual_seed(0)
    return BaseChronosPipeline.from_pretrained(
        repo, revision=revision, device_map="cpu", torch_dtype=torch.float32
    )


def to_tensor(values: FloatArray) -> Any:
    import torch  # noqa: PLC0415

    return torch.tensor(values, dtype=torch.float32)


def predict_median(
    pipeline: Pipeline,
    contexts: list[FloatArray],
    horizon: int,
    convert: Callable[[FloatArray], Any] = to_tensor,
) -> FloatArray:
    """Median forecasts (series x horizon), clipped at zero."""
    quantiles, _ = pipeline.predict_quantiles(
        [convert(c) for c in contexts],
        prediction_length=horizon,
        quantile_levels=[MEDIAN],
    )
    return np.clip(np.asarray(quantiles[..., 0], dtype=np.float64), 0.0, None)


# --- light fine-tuning ---------------------------------------------------------


@dataclass(frozen=True)
class FineTuneSettings:
    """Declared fine-tuning settings (models.yaml); no search is made over them."""

    learning_rate: float = 1e-5
    max_steps: int = 1000
    train_batch: int = 32
    eval_every: int = 25
    patience: int = 4
    min_context: int = 13
    seed: int = 0


@dataclass(frozen=True)
class Windows:
    """Context/target pairs; contexts are left-padded with NaN to a common length."""

    contexts: FloatArray
    targets: FloatArray

    def __len__(self) -> int:
        return int(self.targets.shape[0])


def _stack(pairs: list[tuple[FloatArray, FloatArray]], length: int, horizon: int) -> Windows:
    contexts = np.full((len(pairs), length), np.nan)
    targets = np.zeros((len(pairs), horizon))
    for row, (context, target) in enumerate(pairs):
        contexts[row, length - context.size :] = context
        targets[row] = target
    return Windows(contexts, targets)


def training_windows(
    histories: Mapping[str, FloatArray], horizon: int, min_context: int
) -> tuple[Windows, Windows]:
    """Training and reserved validation windows from the histories of one origin.

    The last ``horizon`` periods of every history are the internal validation reserve: each
    series gives one validation window (the rest of its history as context, the reserve as
    target), and its training windows have targets that end before the reserve. Windows with a
    constant context are skipped: Chronos scales by the context's standard deviation, which is
    then zero, and a single such window would dominate the loss.
    """
    train: list[tuple[FloatArray, FloatArray]] = []
    reserve: list[tuple[FloatArray, FloatArray]] = []
    length = max((h.size for h in histories.values()), default=0)
    for history in histories.values():
        cut = history.size - horizon
        if cut < min_context:
            continue
        if _varies(history[:cut]):
            reserve.append((history[:cut], history[cut:]))
        for end in range(min_context, cut - horizon + 1):
            if _varies(history[:end]):
                train.append((history[:end], history[end : end + horizon]))
    return _stack(train, length, horizon), _stack(reserve, length, horizon)


def _varies(context: FloatArray) -> bool:
    return bool(np.ptp(context) > 0)


def fine_tune(
    pipeline: Pipeline,
    histories: Mapping[str, FloatArray],
    horizon: int,
    settings: FineTuneSettings,
) -> tuple[Pipeline, dict[str, float]]:
    """A fine-tuned copy of ``pipeline`` and a report of the run (the input is not modified).

    AdamW on the model's own quantile loss; the validation loss on the reserve is checked every
    ``eval_every`` steps and training stops after ``patience`` checks without improvement. The
    weights of the best check are returned; step 0 (the zero-shot weights) is a candidate.
    """
    import torch  # noqa: PLC0415

    started = time.perf_counter()
    train, reserve = training_windows(histories, horizon, settings.min_context)
    report: dict[str, float] = {
        "train_windows": len(train),
        "validation_windows": len(reserve),
        "steps": 0,
        "best_step": 0,
    }
    if len(train) == 0 or len(reserve) == 0:
        report["seconds"] = time.perf_counter() - started
        return pipeline, report

    torch.manual_seed(settings.seed)
    generator = torch.Generator().manual_seed(settings.seed)
    model = copy.deepcopy(pipeline.model)
    contexts = torch.tensor(train.contexts, dtype=torch.float32)
    targets = torch.tensor(train.targets, dtype=torch.float32)
    reserve_contexts = torch.tensor(reserve.contexts, dtype=torch.float32)
    reserve_targets = torch.tensor(reserve.targets, dtype=torch.float32)

    def validation_loss() -> float:
        model.eval()
        total = 0.0
        with torch.no_grad():
            for start in range(0, len(reserve), EVAL_BATCH):
                part = slice(start, start + EVAL_BATCH)
                output = model(context=reserve_contexts[part], target=reserve_targets[part])
                total += float(output.loss) * reserve_targets[part].shape[0]
        model.train()
        return total / len(reserve)

    optimizer = torch.optim.AdamW(
        model.parameters(), lr=settings.learning_rate, weight_decay=WEIGHT_DECAY
    )
    best_loss = validation_loss()
    best_state = copy.deepcopy(model.state_dict())
    report["initial_validation_loss"] = best_loss
    stale = 0
    for step in range(1, settings.max_steps + 1):
        rows = torch.randint(len(train), (settings.train_batch,), generator=generator)
        loss = model(context=contexts[rows], target=targets[rows]).loss
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        report["steps"] = step
        if step % settings.eval_every:
            continue
        current = validation_loss()
        if current < best_loss:
            best_loss, best_state, stale = current, copy.deepcopy(model.state_dict()), 0
            report["best_step"] = step
        else:
            stale += 1
            if stale >= settings.patience:
                break
    model.load_state_dict(best_state)
    model.eval()
    report["best_validation_loss"] = best_loss
    report["seconds"] = time.perf_counter() - started
    return type(pipeline)(model), report


Tuner = Callable[
    [Pipeline, Mapping[str, FloatArray], int, FineTuneSettings],
    tuple[Pipeline, dict[str, float]],
]


# --- worker process ------------------------------------------------------------

_WORKER_PIPELINE: Pipeline | None = None
_WORKER_TUNED: Pipeline | None = None


def _worker_start(repo: str, revision: str) -> None:  # pragma: no cover (worker process)
    global _WORKER_PIPELINE  # noqa: PLW0603 (one pipeline per worker process)
    _WORKER_PIPELINE = load_chronos(repo, revision)


def _worker_predict(  # pragma: no cover (worker process)
    contexts: list[FloatArray], horizon: int, tuned: bool = False
) -> FloatArray:
    return predict_median(_WORKER_TUNED if tuned else _WORKER_PIPELINE, contexts, horizon)


def _worker_fine_tune(  # pragma: no cover (worker process)
    histories: Mapping[str, FloatArray], horizon: int, settings: FineTuneSettings
) -> dict[str, float]:
    global _WORKER_TUNED
    _WORKER_TUNED, report = fine_tune(_WORKER_PIPELINE, histories, horizon, settings)
    return report


# --- forecasters ---------------------------------------------------------------


@dataclass
class ChronosZeroShot:
    """Panel forecaster: one batched Chronos call per origin."""

    repo: str
    revision: str
    batch_size: int = 256
    # ``None``: the pipeline runs in a worker process. A loader runs it in this process (tests),
    # with ``convert`` turning each history into the pipeline's input.
    loader: Callable[[str, str], Pipeline] | None = None
    convert: Callable[[FloatArray], Any] = to_tensor
    _pipeline: Pipeline | None = field(default=None, init=False, repr=False)
    _worker: ProcessPoolExecutor | None = field(default=None, init=False, repr=False)

    @property
    def name(self) -> str:
        return "chronos_zero_shot"

    @property
    def family(self) -> str:
        return "pretrained"

    def _base_pipeline(self) -> Pipeline:
        """The pinned weights, loaded in this process (only with a ``loader``)."""
        if self.loader is None:
            raise RuntimeError("the pipeline runs in the worker process")
        if self._pipeline is None:
            self._pipeline = self.loader(self.repo, self.revision)
        return self._pipeline

    def _executor(self) -> ProcessPoolExecutor:
        if self._worker is None:
            self._worker = ProcessPoolExecutor(
                max_workers=1,
                mp_context=multiprocessing.get_context("spawn"),
                initializer=_worker_start,
                initargs=(self.repo, self.revision),
            )
        return self._worker

    def _predict(self, contexts: list[FloatArray], horizon: int) -> FloatArray:
        if self.loader is not None:
            return predict_median(self._base_pipeline(), contexts, horizon, self.convert)
        return self._executor().submit(_worker_predict, contexts, horizon).result()

    def close(self) -> None:
        """Stop the worker process (it also stops when the program ends)."""
        if self._worker is not None:
            self._worker.shutdown()
            self._worker = None

    def forecast_panel(
        self, histories: Mapping[str, FloatArray], horizon: int
    ) -> dict[str, FloatArray]:
        keys = list(histories)
        for key in keys:
            check_history(histories[key])
        forecasts: dict[str, FloatArray] = {}
        for start in range(0, len(keys), self.batch_size):
            batch = keys[start : start + self.batch_size]
            medians = self._predict([histories[k] for k in batch], horizon)
            forecasts.update(zip(batch, medians, strict=True))
        return forecasts


@dataclass
class ChronosFineTuned(ChronosZeroShot):
    """Chronos with light fine-tuning, refitted every ``refit_every`` origins.

    The runner calls ``forecast_panel`` once per origin in chronological order, so a refit at a
    call sees only the histories up to that origin and serves the next ``refit_every`` origins.
    """

    settings: FineTuneSettings = field(default_factory=FineTuneSettings)
    refit_every: int = 1
    # In-process fine-tuning (tests, with a ``loader``); the worker always uses ``fine_tune``.
    tuner: Tuner = fine_tune
    refits: list[dict[str, float]] = field(default_factory=list, init=False, repr=False)
    _tuned: Pipeline | None = field(default=None, init=False, repr=False)
    _calls: int = field(default=0, init=False, repr=False)

    @property
    def name(self) -> str:
        return "chronos_fine_tuned"

    @property
    def fit_seconds(self) -> float:
        """Fine-tuning time across refits (the rest of the run is preparation and inference)."""
        return float(sum(refit.get("seconds", 0.0) for refit in self.refits))

    def details(self) -> dict[str, object]:
        """Declared settings and one report per refit, for the run record."""
        return {
            "settings": asdict(self.settings),
            "refit_every": self.refit_every,
            "refits": self.refits,
        }

    def _refit(self, histories: Mapping[str, FloatArray], horizon: int) -> None:
        if self.loader is not None:
            self._tuned, report = self.tuner(
                self._base_pipeline(), histories, horizon, self.settings
            )
        else:
            future = self._executor().submit(
                _worker_fine_tune, dict(histories), horizon, self.settings
            )
            report = future.result()
        self.refits.append({"call": self._calls, **report})

    def _predict(self, contexts: list[FloatArray], horizon: int) -> FloatArray:
        if self.loader is not None:
            return predict_median(self._tuned, contexts, horizon, self.convert)
        return self._executor().submit(_worker_predict, contexts, horizon, True).result()

    def forecast_panel(
        self, histories: Mapping[str, FloatArray], horizon: int
    ) -> dict[str, FloatArray]:
        for history in histories.values():
            check_history(history)
        if self._calls % self.refit_every == 0:
            self._refit(histories, horizon)
        self._calls += 1
        return super().forecast_panel(histories, horizon)
