"""F9: the single opening of the final test (plan 2.6, phase 4).

``run_final_test`` evaluates the frozen configuration once on the sealed test:

1. the accuracy runs of both frequencies, with the primary window and the two predefined
   contrasts (truncated history, expanding window) and the sensitivity horizons;
2. the inventory simulation, with the safety stock calibrated on the development origins and
   applied, fixed, to the test;
3. the statistical comparison of each frequency.

The opening is recorded in ``data/04_manifests/TEST_OPENED.json`` before the sealed panel is
read. Once an opening has completed, another is refused. An opening interrupted by an error is
recorded as such, and a later attempt is appended to the same record, so every access to the
test stays visible.

``stage="rehearsal"`` runs the same code on the development span, with its last months standing
in for the test, and writes no opening record.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from pcsforecast import __version__
from pcsforecast.config import (
    InventoryConfig,
    ModelsConfig,
    ProtocolConfig,
    StatsConfig,
    load_project_config,
)
from pcsforecast.final_test.panel import FinalTestError, load_evaluation
from pcsforecast.freeze.run import git_head
from pcsforecast.inventory.run import run_inventory
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.stages import Stage
from pcsforecast.runner.run import Condition, Frequency, run_validation
from pcsforecast.stats.run import run_stats

OPENING_FILE = "TEST_OPENED.json"
FREQUENCIES: tuple[Frequency, ...] = ("weekly", "monthly")
CONDITIONS: tuple[Condition, ...] = ("full", "truncated", "expanding")


@dataclass
class FinalTestResult:
    stage: Stage
    runs: list[Path] = field(default_factory=list)
    stats: list[Path] = field(default_factory=list)


def _read_opening(path: Path) -> dict[str, object]:
    if not path.is_file():
        return {"attempts": []}
    record: dict[str, object] = json.loads(path.read_text(encoding="utf-8"))
    return record


def _write_opening(path: Path, record: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, default=str) + "\n", encoding="utf-8")


def _attempts(record: dict[str, object]) -> list[dict[str, object]]:
    attempts = record.get("attempts")
    return attempts if isinstance(attempts, list) else []


def open_test(paths: ProjectPaths, commit: str) -> Path:
    """Record an attempt to open the test; refuse when one has already completed."""
    head = git_head(paths.root)
    if head != commit:
        raise FinalTestError(f"commit {commit} is not the one checked out ({head})")
    path = paths.manifests / OPENING_FILE
    record = _read_opening(path)
    if record.get("status") == "completed":
        raise FinalTestError(f"the final test was already opened ({path}); it is opened once")
    attempts = _attempts(record)
    attempts.append(
        {
            "started_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "commit": commit,
            "package_version": __version__,
            "status": "running",
        }
    )
    record.update({"status": "opening", "attempts": attempts})
    _write_opening(path, record)
    return path


def close_test(path: Path, result: FinalTestResult | None, error: str | None = None) -> None:
    """Mark the latest attempt as completed (with its outputs) or failed."""
    record = _read_opening(path)
    attempt = _attempts(record)[-1]
    attempt["finished_at"] = datetime.now(UTC).isoformat(timespec="seconds")
    if result is not None:
        attempt["status"] = "completed"
        attempt["runs"] = [run.name for run in result.runs]
        attempt["stats"] = [stats.name for stats in result.stats]
        record["status"] = "completed"
    else:
        attempt["status"] = "failed"
        attempt["error"] = error
        record["status"] = "interrupted"
    _write_opening(path, record)


def evaluate(paths: ProjectPaths, stage: Stage) -> FinalTestResult:
    """Accuracy, inventory and statistics of every frequency on the test (or rehearsal)."""
    protocol = load_project_config(paths.configs, ProtocolConfig)
    models = load_project_config(paths.configs, ModelsConfig)
    inventory = load_project_config(paths.configs, InventoryConfig)
    stats = load_project_config(paths.configs, StatsConfig)
    evaluation = load_evaluation(paths, protocol, stage)
    result = FinalTestResult(stage)
    for frequency in FREQUENCIES:
        for condition in CONDITIONS:
            result.runs.append(
                run_validation(
                    paths,
                    frequency,
                    protocol,
                    models,
                    condition=condition,
                    evaluation=evaluation,
                )
            )
        result.runs.append(
            run_inventory(paths, frequency, protocol, models, inventory, evaluation=evaluation)
        )
        result.stats.append(
            run_stats(paths, frequency, stats, protocol.structural_break, stage=stage)
        )
    return result


def run_final_test(paths: ProjectPaths, stage: Stage, commit: str | None = None) -> FinalTestResult:
    """Open the final test once (``stage="test"``, with the checked-out ``commit``) or rehearse."""
    if stage == "rehearsal":
        return evaluate(paths, stage)
    if stage != "test":
        raise FinalTestError(f"unknown final-test stage {stage!r}")
    if commit is None:
        raise FinalTestError("give the checked-out commit (run scripts/open_test.sh)")
    opening = open_test(paths, commit)
    try:
        result = evaluate(paths, stage)
    except Exception as error:
        close_test(opening, None, repr(error))
        raise
    close_test(opening, result)
    return result
