"""F6 step: inventory simulation of every model on the development span (test stays sealed).

The internal-validation origins of each series are split in two halves: the safety-stock
multiplier is calibrated on the first half and the policy is evaluated with that fixed multiplier
on the second half, mirroring the calibrate-then-test rule of plan 2.6.5.

On the final test (F9) the multiplier is calibrated on every internal-validation origin and
applied, fixed, to the origins that serve the test periods (``Evaluation.inventory_spans``).
"""

from __future__ import annotations

import json
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from functools import partial
from pathlib import Path

import numpy as np
import pandas as pd

from pcsforecast import __version__
from pcsforecast.config import (
    FrequencyProtocol,
    InventoryConfig,
    ModelsConfig,
    ProtocolConfig,
    file_sha256,
)
from pcsforecast.final_test.panel import Evaluation, evaluated_panel
from pcsforecast.inventory.calibrator import Calibration, calibrate
from pcsforecast.inventory.simulator import SimulationResult, protection_sigma, simulate
from pcsforecast.manifest import verify_outputs
from pcsforecast.models.base import AnyForecaster, FloatArray
from pcsforecast.models.registry import build_models, pretrained_versions
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.origins import TrainView
from pcsforecast.protocol.stages import run_mode
from pcsforecast.runner.paths import common_length, forecast_paths
from pcsforecast.runner.run import Frequency, close_models, model_details
from pcsforecast.runtime import environment_fingerprint, peak_memory_mb
from pcsforecast.tuning.run import tuned_inputs, tuned_params

MIN_SPAN_ORIGINS = 2


class InventoryInputError(RuntimeError):
    """Inputs differ from what the series step handed over, or the policy is unsupported."""


@dataclass(frozen=True)
class Scenario:
    lead_time: int
    target: float
    primary: bool


@dataclass(frozen=True)
class _SeriesData:
    series_id: str
    units: FloatArray
    amount: FloatArray


def scenarios(config: InventoryConfig) -> list[Scenario]:
    """Primary scenario plus one-at-a-time sensitivities (Table 21)."""
    primary = Scenario(config.lead_time.primary, config.fill_rate_target.primary, True)
    others = [
        Scenario(lead, config.fill_rate_target.primary, False)
        for lead in config.lead_time.sensitivity
    ] + [
        Scenario(config.lead_time.primary, target, False)
        for target in config.fill_rate_target.sensitivity
    ]
    return [primary, *others]


def origin_spans(n_periods: int, protocol: FrequencyProtocol) -> tuple[list[int], list[int]]:
    """Consecutive origins split into a calibration half and an evaluation half."""
    origins = list(range(protocol.min_train_periods - 1, n_periods - 1))
    half = len(origins) // 2
    return origins[:half], origins[half:]


def mean_training_prices(
    series: _SeriesData, origins: Sequence[int], window: int
) -> dict[int, float]:
    """Mean unit price over the training window at each origin (Table 21 sensitivity)."""
    prices: dict[int, float] = {}
    for origin in origins:
        start = max(0, origin + 1 - window)
        units = float(series.units[start : origin + 1].sum())
        if units > 0:
            prices[origin] = float(series.amount[start : origin + 1].sum()) / units
    return prices


def last_known_prices(series: _SeriesData, origins: Sequence[int], window: int) -> dict[int, float]:
    """Unit price of the latest period with sales in the training window (price known at origin).

    The primary valuation of Table 21: the most recent price the company charged before the
    origin. A window without sales leaves the origin without a price (counted as unpriced units).
    """
    prices: dict[int, float] = {}
    for origin in origins:
        start = max(0, origin + 1 - window)
        sold = np.flatnonzero(series.units[start : origin + 1] > 0)
        if sold.size:
            period = start + int(sold[-1])
            prices[origin] = float(series.amount[period]) / float(series.units[period])
    return prices


PRICE_RULES: dict[str, Callable[[_SeriesData, Sequence[int], int], dict[int, float]]] = {
    "price_known_at_origin": last_known_prices,
    "mean_training_price": mean_training_prices,
}


@dataclass
class _PolicyRunner:
    """Memoised simulations of one series, model and lead time, keyed by span and multiplier."""

    units: FloatArray
    forecasts: dict[int, float]
    sigmas: dict[int, float]
    prices: dict[int, float]
    lead_time: int
    cache: dict[tuple[tuple[int, ...], float], SimulationResult] = field(default_factory=dict)

    def __call__(self, span: tuple[int, ...], multiplier: float) -> SimulationResult:
        key = (span, multiplier)
        if key not in self.cache:
            self.cache[key] = simulate(
                self.units,
                span,
                self.forecasts,
                self.sigmas,
                multiplier=multiplier,
                lead_time=self.lead_time,
                prices=self.prices,
            )
        return self.cache[key]


def _row(
    *,
    series: _SeriesData,
    model: AnyForecaster,
    case: Scenario,
    chosen: Calibration,
    result: SimulationResult,
    sensitivity: SimulationResult | None,
) -> dict[str, object]:
    return {
        "series_id": series.series_id,
        "model": model.name,
        "family": model.family,
        "lead_time": case.lead_time,
        "fill_rate_target": case.target,
        "primary_scenario": case.primary,
        "multiplier": chosen.multiplier,
        "target_reached": chosen.target_reached,
        "calibration_fill_rate": chosen.calibration_fill_rate,
        "fill_rate": result.fill_rate,
        "demand": result.demand,
        "served": result.served,
        "lost_units": result.lost,
        "lost_value": result.lost_value,
        "lost_unpriced_units": result.lost_unpriced_units,
        "lost_value_sensitivity": sensitivity.lost_value if sensitivity else np.nan,
        "lost_unpriced_units_sensitivity": (
            sensitivity.lost_unpriced_units if sensitivity else np.nan
        ),
        "mean_on_hand": result.mean_on_hand,
        "mean_safety_stock": result.mean_safety_stock,
        "orders": result.orders,
        "periods": result.periods,
    }


def _simulate_series(
    *,
    series: _SeriesData,
    model: AnyForecaster,
    paths: dict[int, FloatArray],
    protocol: FrequencyProtocol,
    config: InventoryConfig,
    cases: Sequence[Scenario],
    spans: tuple[list[int], list[int]] | None = None,
) -> list[dict[str, object]]:
    calibration, evaluation = spans or origin_spans(series.units.size, protocol)
    all_origins = calibration + evaluation
    if any(origin not in paths for origin in all_origins):
        return []
    window = protocol.window
    valuation = config.lost_sales_valuation
    prices = PRICE_RULES[valuation.primary](series, all_origins, window.length)
    sensitivity_prices = (
        PRICE_RULES[valuation.sensitivity](series, all_origins, window.length)
        if valuation.sensitivity
        else None
    )
    histories = {
        o: TrainView.at(series.units, o, window.primary, window.length).history for o in all_origins
    }
    rows: list[dict[str, object]] = []
    for lead_time in sorted({case.lead_time for case in cases}):
        protection = config.review_period + lead_time
        runner = _PolicyRunner(
            units=series.units,
            forecasts={o: float(path[:protection].sum()) for o, path in paths.items()},
            sigmas={o: protection_sigma(h, protection) for o, h in histories.items()},
            prices=prices,
            lead_time=lead_time,
        )
        calibration_span, evaluation_span = tuple(calibration), tuple(evaluation)
        for case in (c for c in cases if c.lead_time == lead_time):
            chosen = calibrate(
                config.safety_stock.grid_multipliers,
                case.target,
                partial(runner, calibration_span),
            )
            result = runner(evaluation_span, chosen.multiplier)
            # Same policy and multiplier; only the price that values the lost units changes.
            sensitivity = (
                simulate(
                    series.units,
                    evaluation_span,
                    runner.forecasts,
                    runner.sigmas,
                    multiplier=chosen.multiplier,
                    lead_time=lead_time,
                    prices=sensitivity_prices,
                )
                if sensitivity_prices is not None
                else None
            )
            rows.append(
                _row(
                    series=series,
                    model=model,
                    case=case,
                    chosen=chosen,
                    result=result,
                    sensitivity=sensitivity,
                )
            )
    return rows


LIST_PRICES = Path("price_links") / "sku_prices.parquet"


def _list_prices(paths: ProjectPaths) -> pd.DataFrame | None:
    """SKU list prices from the price-list link step, when it has been run."""
    directory = paths.series / LIST_PRICES.parent
    if not (directory / "manifest.json").is_file():
        return None
    changed = verify_outputs(directory, paths.root)
    if changed:
        raise InventoryInputError(f"price links differ from their manifest: {changed}")
    return pd.read_parquet(paths.series / LIST_PRICES)


def value_at_list_prices(
    simulation: pd.DataFrame, list_prices: pd.DataFrame | None
) -> pd.DataFrame:
    """Lost sales valued at the distributor list price (SKU series with a linked price).

    ``lost_value_list_fill`` keeps the primary valuation and adds the list price only for the
    lost units that had no price known at the origin; ``lost_value_at_list`` values every lost
    unit at the list price (current prices, a sensitivity). Other columns are unchanged.
    """
    result = simulation.copy()
    if list_prices is None or result.empty:
        result["list_price"] = np.nan
    else:
        prices = list_prices.set_index("sku_id")["list_price"]
        at_sku = result["level"] == "sku"
        result["list_price"] = result["key"].map(prices).where(at_sku)
    result["lost_value_list_fill"] = result["lost_value"] + (
        result["lost_unpriced_units"] * result["list_price"]
    ).fillna(0.0)
    result["lost_value_at_list"] = result["lost_units"] * result["list_price"]
    return result


def run_inventory(
    paths: ProjectPaths,
    frequency: Frequency,
    protocol: ProtocolConfig,
    models_config: ModelsConfig,
    config: InventoryConfig,
    *,
    evaluation: Evaluation | None = None,
) -> Path:
    """Simulate the (R, S) policy for every implemented model and selected series.

    With ``evaluation`` the simulation covers the final test (or its rehearsal).
    """
    if config.review_period != 1:
        raise InventoryInputError("only a review period of 1 is implemented")
    panel, panel_inputs, stage = evaluated_panel(paths, evaluation, InventoryInputError)
    profile = pd.read_parquet(paths.series / "profile.parquet")
    selected = profile[(profile["frequency"] == frequency) & profile["selected"]]
    frequency_protocol = protocol.frequencies[frequency]
    model_set = build_models(models_config, frequency, tuned_params(paths, frequency))
    cases = scenarios(config)

    started = datetime.now(UTC)
    rows: list[dict[str, object]] = []
    failures: list[dict[str, object]] = []
    ordered = panel[
        (panel["frequency"] == frequency) & panel["series_id"].isin(selected["series_id"])
    ].sort_values(["series_id", "period_start"])
    all_series = {
        str(series_id): _SeriesData(
            str(series_id),
            frame["units"].to_numpy(dtype=np.float64),
            frame["amount"].to_numpy(dtype=np.float64),
        )
        for series_id, frame in ordered.groupby("series_id")
    }
    units = {key: series.units for key, series in all_series.items()}
    spans = (
        None if evaluation is None else evaluation.inventory_spans(frequency, frequency_protocol)
    )
    calibration, evaluated = spans or origin_spans(common_length(units), frequency_protocol)
    if len(calibration) < MIN_SPAN_ORIGINS or len(evaluated) < MIN_SPAN_ORIGINS:
        raise InventoryInputError(
            "the development span is too short for calibration and evaluation"
        )
    longest = config.review_period + max(case.lead_time for case in cases)
    for model in model_set.models:
        computed = forecast_paths(
            model, units, calibration + evaluated, frequency_protocol.window, longest
        )
        failures.extend(computed.failures)
        for key, series in all_series.items():
            rows.extend(
                _simulate_series(
                    series=series,
                    model=model,
                    paths=computed.paths[key],
                    protocol=frequency_protocol,
                    config=config,
                    cases=cases,
                    spans=spans,
                )
            )
    close_models(model_set.models)
    simulation = pd.DataFrame(rows)
    simulation = simulation.merge(
        selected[["series_id", "channel", "level", "key", "pattern"]],
        on="series_id",
        how="left",
        validate="many_to_one",
    )
    list_prices = _list_prices(paths)
    simulation = value_at_list_prices(simulation, list_prices)

    suffix = "inventory" if evaluation is None else f"{stage}-inventory"
    run_id = f"{started:%Y%m%dT%H%M%SZ}-{frequency}-{suffix}"
    out = paths.runs / run_id
    out.mkdir(parents=True, exist_ok=False)
    simulation.to_parquet(out / "simulation.parquet", index=False)
    record = {
        "run_id": run_id,
        "mode": run_mode("inventory", stage),
        "frequency": frequency,
        "policy": config.policy,
        "review_period": config.review_period,
        "scenarios": [case.__dict__ for case in cases],
        "safety_stock_grid": config.safety_stock.grid_multipliers,
        "lost_sales_valuation": config.lost_sales_valuation.model_dump(),
        "spans": (
            "origins split in halves: calibration (first) and evaluation (second)"
            if evaluation is None
            else "calibration on the development origins, evaluation on the test origins"
        ),
        "package_version": __version__,
        "started_at": started.isoformat(timespec="seconds"),
        "finished_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "inputs": {
            **panel_inputs,
            "protocol.yaml": file_sha256(paths.configs / "protocol.yaml"),
            "models.yaml": file_sha256(paths.configs / "models.yaml"),
            "inventory.yaml": file_sha256(paths.configs / "inventory.yaml"),
            **tuned_inputs(paths),
            **(
                {"sku_prices": file_sha256(paths.series / LIST_PRICES)}
                if list_prices is not None
                else {}
            ),
        },
        "series": int(simulation["series_id"].nunique()) if not simulation.empty else 0,
        "models": [m.name for m in model_set.models],
        "params": model_set.params,
        "pretrained": pretrained_versions(models_config),
        "model_details": model_details(model_set.models),
        "failures": failures,
        "test_span_used": evaluation is not None and evaluation.test_span_used,
        **({} if evaluation is None else evaluation.record()),
        "peak_memory_mb": peak_memory_mb(),
        "environment": environment_fingerprint(),
    }
    (out / "run.json").write_text(
        json.dumps(record, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8"
    )
    return out
