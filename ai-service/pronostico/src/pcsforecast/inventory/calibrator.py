"""Safety-stock calibration: smallest grid multiplier that reaches the fill-rate target (2.6.5).

Calibration uses only its own span of origins; the chosen multiplier is then fixed and applied to
a later span, never re-tuned there.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from pcsforecast.inventory.simulator import SimulationResult


@dataclass(frozen=True)
class Calibration:
    multiplier: float
    target_reached: bool
    calibration_fill_rate: float


def calibrate(
    grid: Sequence[float],
    target: float,
    run: Callable[[float], SimulationResult],
) -> Calibration:
    """First multiplier of the increasing ``grid`` whose simulated fill rate reaches ``target``.

    If none reaches it, the largest multiplier is used and ``target_reached`` is False.
    """
    result: SimulationResult | None = None
    for multiplier in grid:
        result = run(multiplier)
        if result.fill_rate >= target:
            return Calibration(multiplier, True, result.fill_rate)
    if result is None:
        raise ValueError("the multiplier grid is empty")
    return Calibration(grid[-1], False, result.fill_rate)
