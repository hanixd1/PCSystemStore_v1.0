"""Periodic-review order-up-to (R, S) policy with lost sales, R = 1 period.

Timeline of every period ``t`` after the first origin:

1. orders that become available in ``t`` are received;
2. the observed demand of ``t`` is served from stock on hand; what cannot be served is lost;
3. at the end of ``t`` the inventory position (on hand + on order) is raised to
   ``S_t = F_t + SS_t`` with an order of ``ceil(max(0, S_t - position))`` units, available at the
   start of ``t + L + 1``.

``F_t`` is the forecast of the ``R + L`` periods after ``t`` made at origin ``t`` and
``SS_t = m * sigma_t``, where ``sigma_t`` is the same for every model (see ``protection_sigma``).
The first origin starts with stock equal to its target level and nothing on order (Table 21).
"""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

import numpy as np

from pcsforecast.evaluation.metrics import naive_scales
from pcsforecast.models.base import FloatArray


@dataclass(frozen=True)
class SimulationResult:
    periods: int
    demand: float
    served: float
    lost: float
    mean_on_hand: float
    mean_safety_stock: float
    orders: int
    lost_value: float
    lost_unpriced_units: float

    @property
    def fill_rate(self) -> float:
        """Share of demand served from stock; 1.0 when there was no demand."""
        return 1.0 if self.demand == 0 else self.served / self.demand


def protection_sigma(history: FloatArray, protection: int) -> float:
    """Spread for the safety stock: in-sample one-step naive RMSE times sqrt(R + L).

    It depends only on the training window, so every model faces the same rule and only the
    multiplier ``m`` is calibrated.
    """
    _, mse = naive_scales(history)
    if math.isnan(mse):
        return 0.0
    return math.sqrt(mse) * math.sqrt(protection)


def _lost_value(lost: float, price: float | None) -> tuple[float, float]:
    """Value of lost units at the price known at the previous origin, or the unpriced units."""
    if lost <= 0:
        return 0.0, 0.0
    if price is None or not math.isfinite(price):
        return 0.0, lost
    return lost * price, 0.0


def simulate(
    demand: FloatArray,
    origins: Sequence[int],
    forecasts: Mapping[int, float],
    sigmas: Mapping[int, float],
    *,
    multiplier: float,
    lead_time: int,
    prices: Mapping[int, float] | None = None,
) -> SimulationResult:
    """Simulate the policy from ``origins[0]`` over the periods that follow it.

    ``forecasts[t]`` and ``sigmas[t]`` must exist for every origin ``t``; the simulation serves
    the periods ``origins[0] + 1 .. origins[-1] + 1``.
    """
    first, last = origins[0], origins[-1]
    target = forecasts[first] + multiplier * sigmas[first]
    on_hand = float(math.ceil(max(target, 0.0)))
    pipeline: dict[int, float] = defaultdict(float)
    prices = prices or {}
    served_total = lost_total = lost_value = unpriced = 0.0
    stock_levels: list[float] = []
    safety: list[float] = []
    orders = 0
    for period in range(first + 1, last + 2):
        on_hand += pipeline.pop(period, 0.0)
        wanted = float(demand[period])
        served = min(on_hand, wanted)
        lost = wanted - served
        on_hand -= served
        served_total += served
        lost_total += lost
        value, unpriced_units = _lost_value(lost, prices.get(period - 1))
        lost_value += value
        unpriced += unpriced_units
        stock_levels.append(on_hand)
        if period <= last:
            safety_stock = multiplier * sigmas[period]
            safety.append(safety_stock)
            position = on_hand + sum(pipeline.values())
            quantity = math.ceil(max(0.0, forecasts[period] + safety_stock - position))
            if quantity > 0:
                pipeline[period + lead_time + 1] += quantity
                orders += 1
    return SimulationResult(
        periods=len(stock_levels),
        demand=served_total + lost_total,
        served=served_total,
        lost=lost_total,
        mean_on_hand=float(np.mean(stock_levels)) if stock_levels else 0.0,
        mean_safety_stock=float(np.mean(safety)) if safety else 0.0,
        orders=orders,
        lost_value=lost_value,
        lost_unpriced_units=unpriced,
    )
