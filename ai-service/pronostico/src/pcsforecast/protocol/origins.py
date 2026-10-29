"""Rolling origins and training views (plan Table 17), and the seal on the final test.

A ``TrainView`` is the only thing a model receives: the values of one series up to and including
the origin period, trimmed to the training window. Targets are read separately by the runner.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from pcsforecast.config import FrequencyProtocol, file_sha256
from pcsforecast.models.base import FloatArray

FREEZE_FILE = "FREEZE.json"


class SealedTestError(RuntimeError):
    """The final-test span was requested before the configuration was frozen."""


@dataclass(frozen=True)
class Origin:
    """Position (0-based) of the last training period, and the horizons it can evaluate."""

    position: int
    horizons: tuple[int, ...]


@dataclass(frozen=True)
class TrainView:
    history: FloatArray
    origin: int

    @classmethod
    def at(cls, series: FloatArray, origin: int, window: str, length: int) -> TrainView:
        start = max(0, origin + 1 - length) if window == "rolling" else 0
        history = np.array(series[start : origin + 1], dtype=np.float64)
        history.setflags(write=False)
        return cls(history=history, origin=origin)


def validation_origins(n_periods: int, protocol: FrequencyProtocol) -> list[Origin]:
    """Origins whose targets all fall inside the ``n_periods`` development periods."""
    first = protocol.min_train_periods - 1
    origins = []
    for position in range(first, n_periods - 1, protocol.origin_step):
        horizons = tuple(h for h in protocol.horizons if position + h < n_periods)
        if horizons:
            origins.append(Origin(position, horizons))
    return origins


def final_test_origins(split: Sequence[str], protocol: FrequencyProtocol) -> list[Origin]:
    """Origins of the final test: every horizon whose target period is labelled ``test``.

    ``split`` labels each period of the series (development, excluded, test). The training view
    of an origin may include earlier test periods, as in the rolling use of the forecast.
    """
    first = protocol.min_train_periods - 1
    origins = []
    for position in range(first, len(split) - 1):
        horizons = tuple(
            h
            for h in protocol.horizons
            if position + h < len(split) and split[position + h] == "test"
        )
        if horizons:
            origins.append(Origin(position, horizons))
    return origins


def assert_unsealed(manifests_dir: Path, configs_dir: Path | None = None) -> dict[str, object]:
    """Return the freeze record, or refuse access to the sealed test span.

    With ``configs_dir``, every configuration file recorded at the freeze must still have the
    recorded SHA-256: a configuration changed after the freeze keeps the test sealed.
    """
    path = manifests_dir / FREEZE_FILE
    if not path.is_file():
        raise SealedTestError(
            "the final test is sealed: freeze the protocol (phase F8) before opening it"
        )
    record: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    if record.get("status") != "frozen":
        raise SealedTestError(f"{path} does not record a frozen configuration")
    if configs_dir is not None:
        recorded = record.get("configs")
        if not isinstance(recorded, dict) or not recorded:
            raise SealedTestError(f"{path} records no configuration hashes")
        changed = sorted(
            name
            for name, digest in recorded.items()
            if not (configs_dir / name).is_file() or file_sha256(configs_dir / name) != digest
        )
        if changed:
            raise SealedTestError(f"configuration changed after the freeze: {', '.join(changed)}")
    return record
