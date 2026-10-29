"""Stages of the evaluation and the run modes recorded for each (plan 2.6, phases 2 and 4).

* ``development``: internal validation and inventory simulation on the development span.
* ``rehearsal``: the final-test procedure on the development span, with the last months of
  development standing in for the test. It checks the code path before the single opening.
* ``test``: the single opening of the sealed final test (F9).
"""

from __future__ import annotations

from typing import Literal

Stage = Literal["development", "rehearsal", "test"]
Kind = Literal["validation", "inventory"]

RUN_MODES: dict[tuple[str, str], str] = {
    ("validation", "development"): "internal_validation",
    ("inventory", "development"): "inventory_simulation",
    ("validation", "rehearsal"): "final_test_rehearsal",
    ("inventory", "rehearsal"): "final_test_rehearsal_inventory",
    ("validation", "test"): "final_test",
    ("inventory", "test"): "final_test_inventory",
}


def run_mode(kind: str, stage: str) -> str:
    """Mode written in the run record of a ``kind`` of run at a ``stage``."""
    return RUN_MODES[(kind, stage)]
