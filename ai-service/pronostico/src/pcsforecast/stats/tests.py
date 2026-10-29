"""Statistical comparison of forecasting models (plan 2.6.6, Table 14).

* Friedman with series as blocks and the Nemenyi post-hoc test (Demšar, 2006).
* Diebold-Mariano for predefined pairs, per series, with the Harvey-Leybourne-Newbold small-sample
  correction and a lag window of ``horizon - 1`` (Diebold & Mariano, 1995). Series of different
  scale are never concatenated.
* Wilcoxon signed-rank for paired differences, Holm adjustment for multiple comparisons.
* Spearman correlation between two rankings of the models, with a confidence interval from a
  bootstrap that resamples whole series (blocks).

Origins of one series overlap, so no test is run on values of individual origins: every test
uses one value per series and model.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy import stats

FloatArray = np.ndarray


@dataclass(frozen=True)
class FriedmanResult:
    statistic: float
    p_value: float
    series: int
    models: int
    mean_ranks: dict[str, float]
    critical_difference: float  # Nemenyi CD at the given alpha


def complete_blocks(scores: pd.DataFrame) -> pd.DataFrame:
    """Rows (series) with a defined value for every column (model)."""
    return scores.dropna(axis=0, how="any")


def mean_ranks(scores: pd.DataFrame) -> pd.Series:
    """Mean rank of each model across series (1 = lowest score, ties averaged)."""
    return scores.rank(axis=1, method="average").mean(axis=0).sort_values()


def nemenyi_critical_difference(models: int, series: int, alpha: float) -> float:
    q_alpha = stats.studentized_range.ppf(1 - alpha, models, np.inf) / np.sqrt(2)
    return float(q_alpha * np.sqrt(models * (models + 1) / (6.0 * series)))


def friedman(scores: pd.DataFrame, alpha: float = 0.05) -> FriedmanResult | None:
    """Friedman test on a series x model table; ``None`` when there are too few blocks."""
    blocks = complete_blocks(scores)
    models = blocks.shape[1]
    if models < 3 or len(blocks) < 2:  # noqa: PLR2004 (the test needs k >= 3 and n >= 2)
        return None
    with np.errstate(invalid="ignore", divide="ignore"):
        statistic, p_value = stats.friedmanchisquare(*(blocks[c].to_numpy() for c in blocks))
    if not np.isfinite(statistic):  # every series ties all models: nothing to test
        return None
    return FriedmanResult(
        statistic=float(statistic),
        p_value=float(p_value),
        series=len(blocks),
        models=models,
        mean_ranks={str(k): float(v) for k, v in mean_ranks(blocks).items()},
        critical_difference=nemenyi_critical_difference(models, len(blocks), alpha),
    )


def nemenyi(scores: pd.DataFrame) -> pd.DataFrame:
    """Pairwise Nemenyi p-values after Friedman (models x models)."""
    blocks = complete_blocks(scores)
    k, n = blocks.shape[1], len(blocks)
    ranks = mean_ranks(blocks).reindex(blocks.columns)
    se = np.sqrt(k * (k + 1) / (6.0 * n))
    names = list(blocks.columns)
    table = pd.DataFrame(1.0, index=names, columns=names)
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            z = abs(ranks[a] - ranks[b]) / se
            p = float(stats.studentized_range.sf(z * np.sqrt(2), k, np.inf))
            table.loc[a, b] = table.loc[b, a] = min(1.0, p)
    return table


def holm(p_values: Sequence[float]) -> list[float]:
    """Holm step-down adjusted p-values, in the input order."""
    values = np.asarray(p_values, dtype=float)
    order = np.argsort(values)
    m = len(values)
    adjusted = np.empty(m)
    running = 0.0
    for position, index in enumerate(order):
        running = max(running, (m - position) * values[index])
        adjusted[index] = min(1.0, running)
    return adjusted.tolist()


def diebold_mariano(
    errors_a: FloatArray, errors_b: FloatArray, horizon: int, power: int = 2
) -> tuple[float, float]:
    """DM statistic and two-sided p-value (HLN-corrected, Student t with n - 1 df).

    Positive statistic: model ``a`` has the larger loss. NaN when the loss differential is
    constant or there are fewer than three pairs.
    """
    d = np.abs(np.asarray(errors_a)) ** power - np.abs(np.asarray(errors_b)) ** power
    n = d.size
    if n < 3:  # noqa: PLR2004 (variance and the correction need at least three pairs)
        return float("nan"), float("nan")
    mean = d.mean()
    centred = d - mean
    variance = float(np.dot(centred, centred) / n)
    for lag in range(1, min(horizon, n)):
        variance += 2.0 * float(np.dot(centred[lag:], centred[:-lag]) / n)
    if variance <= 0:
        return float("nan"), float("nan")
    statistic = mean / np.sqrt(variance / n)
    correction = np.sqrt((n + 1 - 2 * horizon + horizon * (horizon - 1) / n) / n)
    statistic *= correction
    p_value = 2.0 * float(stats.t.sf(abs(statistic), df=n - 1))
    return float(statistic), p_value


def wilcoxon_pairs(scores: pd.DataFrame, pairs: Sequence[tuple[str, str]]) -> pd.DataFrame:
    """Wilcoxon signed-rank test per pair on complete series, with Holm-adjusted p-values."""
    blocks = complete_blocks(scores)
    rows = []
    for a, b in pairs:
        if a not in blocks or b not in blocks:
            continue
        diff = blocks[a] - blocks[b]
        if (diff == 0).all():
            statistic, p_value = float("nan"), 1.0
        else:
            result = stats.wilcoxon(blocks[a], blocks[b], zero_method="wilcox")
            statistic, p_value = float(result.statistic), float(result.pvalue)
        rows.append(
            {
                "model_a": a,
                "model_b": b,
                "series": len(blocks),
                "median_difference": float(diff.median()),
                "statistic": statistic,
                "p_value": p_value,
            }
        )
    table = pd.DataFrame(rows)
    if not table.empty:
        table["p_holm"] = holm(table["p_value"].tolist())
    return table


@dataclass(frozen=True)
class SpearmanResult:
    rho: float
    ci_low: float
    ci_high: float
    resamples: int
    models: int


def spearman_block_bootstrap(
    first: pd.DataFrame,
    second: pd.DataFrame,
    *,
    rank_first: Callable[[pd.DataFrame], pd.Series],
    rank_second: Callable[[pd.DataFrame], pd.Series],
    resamples: int,
    seed: int,
    confidence: float = 0.95,
) -> SpearmanResult:
    """Spearman rho between two model rankings; CI by resampling series with replacement.

    ``first`` and ``second`` are series x model tables over the same series; ``rank_*`` turn a
    table into one value per model (e.g. mean rank of MASE, aggregate fill rate).
    """
    series = first.index.intersection(second.index)
    first, second = first.loc[series], second.loc[series]

    def rho(a: pd.DataFrame, b: pd.DataFrame) -> float:
        x, y = rank_first(a), rank_second(b)
        models = x.index.intersection(y.index)
        if x[models].nunique() < 2 or y[models].nunique() < 2:  # noqa: PLR2004 (constant ranking)
            return float("nan")
        return float(stats.spearmanr(x[models], y[models]).statistic)

    point = rho(first, second)
    rng = np.random.default_rng(seed)
    draws = []
    for _ in range(resamples):
        picked = rng.integers(0, len(series), len(series))
        value = rho(first.iloc[picked], second.iloc[picked])
        if np.isfinite(value):
            draws.append(value)
    tail = (1 - confidence) / 2
    low, high = (
        (float(np.quantile(draws, tail)), float(np.quantile(draws, 1 - tail)))
        if draws
        else (float("nan"), float("nan"))
    )
    return SpearmanResult(point, low, high, len(draws), int(first.shape[1]))
