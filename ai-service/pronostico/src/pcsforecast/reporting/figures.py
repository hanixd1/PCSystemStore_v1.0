"""Figures for the thesis results chapter (plan Table 22), built from the recorded artifacts.

* Critical-difference diagrams (Demšar, 2006): mean rank of each model by MASE and the Nemenyi
  critical difference, for categories and SKUs of each frequency (channel total, h = 1). Models
  joined by a bar do not differ significantly.
* Service against stock: fill rate and mean stock on hand of each model in the primary inventory
  scenario, for categories and the total series of each frequency (channel total).

Text in the figures is in Spanish, the language of the thesis. Colours encode the model family
(four fixed hues, validated for colour-vision deficiency); every point is also labelled and has
a family marker, so identity never depends on colour alone. matplotlib is imported lazily: it
belongs to the ``stats`` extra.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.stages import Stage
from pcsforecast.stats.run import latest_run, stats_name

CHANNEL = "total"
DPI = 300
INK = "#1f1f1e"
MUTED = "#6b6a63"
GRID = "#d9d8d2"
MODEL_LABELS = {
    "naive": "Ingenuo",
    "ses": "SES",
    "croston": "Croston",
    "sba": "SBA",
    "tsb": "TSB",
    "two_stage_trees": "Árboles en dos etapas",
    "global_gbm": "Modelo global",
    "chronos_zero_shot": "Chronos zero-shot",
    "chronos_fine_tuned": "Chronos ajuste ligero",
}
BASELINE = "Línea base"
INTERMITTENT = "Intermitente"
LEARNING = "Aprendizaje automático"
PRETRAINED = "Preentrenado"
FAMILIES = {
    "naive": BASELINE,
    "ses": BASELINE,
    "croston": INTERMITTENT,
    "sba": INTERMITTENT,
    "tsb": INTERMITTENT,
    "two_stage_trees": LEARNING,
    "global_gbm": LEARNING,
    "chronos_zero_shot": PRETRAINED,
    "chronos_fine_tuned": PRETRAINED,
}
# Categorical slots 1-3 and 7 of the reference palette, fixed per family.
FAMILY_STYLE = {
    BASELINE: ("#2a78d6", "o"),
    INTERMITTENT: ("#eb6834", "s"),
    LEARNING: ("#1baf7a", "^"),
    PRETRAINED: ("#6250d6", "D"),
}
FREQUENCY_LABELS = {"weekly": "Semanal", "monthly": "Mensual"}
LEVEL_LABELS = {"category": "categorías", "sku": "SKU", "total": "serie total"}


class FigureInputError(RuntimeError):
    """A run or statistics table the figures need is missing."""


def _pyplot() -> Any:
    import matplotlib  # noqa: PLC0415 - optional dependency (stats extra)

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt  # noqa: PLC0415

    plt.rcParams.update(
        {
            "font.size": 8,
            "axes.edgecolor": MUTED,
            "axes.labelcolor": INK,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "text.color": INK,
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )
    return plt


def cliques(ranks: Sequence[float], critical_difference: float) -> list[tuple[int, int]]:
    """Maximal runs of rank-sorted models whose rank spread is below the critical difference."""
    groups: list[tuple[int, int]] = []
    for start in range(len(ranks)):
        end = start
        while end + 1 < len(ranks) and ranks[end + 1] - ranks[start] < critical_difference:
            end += 1
        if end > start and not any(s <= start and end <= e for s, e in groups):
            groups.append((start, end))
    return groups


def decimal(value: float, digits: int = 2) -> str:
    """Number with a decimal comma, as written in the thesis."""
    return f"{value:.{digits}f}".replace(".", ",")


def draw_critical_difference(
    ax: Any, mean_ranks: Mapping[str, float], critical_difference: float, title: str
) -> None:
    ordered = sorted(mean_ranks.items(), key=lambda item: item[1])
    names = [MODEL_LABELS.get(name, name) for name, _ in ordered]
    ranks = [rank for _, rank in ordered]
    k = len(ranks)
    half = (k + 1) // 2
    ax.set_xlim(-2.6, k + 3.6)
    ax.set_ylim(0.95 - 0.3 * half, 1.62)
    ax.axis("off")
    ax.hlines(1, 1, k, color=INK, linewidth=1)
    for tick in range(1, k + 1):
        ax.vlines(tick, 1, 1.07, color=INK, linewidth=1)
        ax.text(tick, 1.1, str(tick), ha="center", va="bottom", fontsize=7, color=MUTED)
    ax.hlines(1.42, 1, 1 + critical_difference, color=INK, linewidth=1.5)
    for edge in (1, 1 + critical_difference):
        ax.vlines(edge, 1.39, 1.45, color=INK, linewidth=1)
    ax.text(
        1 + critical_difference / 2,
        1.47,
        f"DC = {decimal(critical_difference)}",
        ha="center",
        va="bottom",
        fontsize=7,
    )
    for position, (name, rank) in enumerate(zip(names, ranks, strict=True)):
        left = position < half
        row = position if left else k - 1 - position
        y = 0.68 - 0.3 * row
        x_text = 0.4 if left else k + 0.6
        ax.plot([rank, rank, x_text], [1, y, y], color=MUTED, linewidth=0.8)
        ax.text(
            x_text + (-0.08 if left else 0.08),
            y,
            f"{name} ({decimal(rank)})",
            ha="right" if left else "left",
            va="center",
            fontsize=7,
        )
    for depth, (start, end) in enumerate(cliques(ranks, critical_difference)):
        y = 0.9 - 0.06 * depth
        ax.hlines(y, ranks[start] - 0.06, ranks[end] + 0.06, color=INK, linewidth=2.5)
    ax.set_title(title, fontsize=9, loc="left")


# Each point carries a short number (its model's position in MODEL_LABELS); the legend maps the
# number, marker and colour to the model, so dense clusters stay readable.
MODEL_NUMBERS = {name: str(index) for index, name in enumerate(MODEL_LABELS, start=1)}
LABEL_OFFSETS = tuple(
    (round(radius * dx), round(radius * dy))
    for radius in (5, 9, 13)
    for dx, dy in ((1, 0.6), (-1, 0.6), (1, -1), (-1, -1), (0, 1.2), (0, -1.6))
)
MARKER_HALF = 4.0


def _overlaps(box: Any, others: Sequence[Any]) -> bool:
    return any(box.overlaps(other) for other in others)


def place_labels(ax: Any, frame: pd.DataFrame) -> None:
    """Number every point next to its marker, avoiding other numbers and markers."""
    from matplotlib.transforms import Bbox  # noqa: PLC0415 - optional dependency

    renderer = ax.figure.canvas.get_renderer()
    inside = ax.get_window_extent(renderer)
    scale = ax.figure.dpi / 72
    rows = frame.reset_index(drop=True)
    centres = [
        ax.transData.transform((x, y))
        for x, y in zip(rows["mean_on_hand"], rows["fill_rate"], strict=True)
    ]
    markers = [
        Bbox.from_extents(
            cx - MARKER_HALF * scale,
            cy - MARKER_HALF * scale,
            cx + MARKER_HALF * scale,
            cy + MARKER_HALF * scale,
        )
        for cx, cy in centres
    ]
    placed: list[Any] = []
    for index, row in enumerate(rows.itertuples()):
        others = [box for k, box in enumerate(markers) if k != index]
        chosen = None
        for dx, dy in LABEL_OFFSETS:
            text = ax.annotate(
                MODEL_NUMBERS.get(str(row.model), "?"),
                (row.mean_on_hand, row.fill_rate),
                xytext=(dx, dy),
                textcoords="offset points",
                fontsize=7,
                color=INK,
                fontweight="bold",
                ha="center",
                va="center",
            )
            box = text.get_window_extent(renderer)
            fits = inside.contains(box.x0, box.y0) and inside.contains(box.x1, box.y1)
            if fits and not _overlaps(box, placed) and not _overlaps(box, others):
                chosen = text
                break
            text.remove()
        if chosen is None:  # crowded: keep the nearest position
            dx, dy = LABEL_OFFSETS[0]
            chosen = ax.annotate(
                MODEL_NUMBERS.get(str(row.model), "?"),
                (row.mean_on_hand, row.fill_rate),
                xytext=(dx, dy),
                textcoords="offset points",
                fontsize=7,
                color=INK,
                fontweight="bold",
                ha="center",
                va="center",
            )
        placed.append(chosen.get_window_extent(renderer))


def draw_service_stock(ax: Any, frame: pd.DataFrame, target: float, title: str) -> None:
    for row in frame.itertuples():
        family = FAMILIES.get(str(row.model), BASELINE)
        colour, marker = FAMILY_STYLE[family]
        ax.scatter(
            row.mean_on_hand,
            row.fill_rate,
            s=36,
            color=colour,
            marker=marker,
            edgecolors="white",
            linewidths=0.8,
            zorder=3,
        )
    ax.margins(x=0.22, y=0.14)
    low, high = ax.get_ylim()
    # The target stays in view, and a fill rate never exceeds 1.
    ax.set_ylim(min(low, target - 0.01), max(min(high, 1.01), target + 0.01))
    ax.axhline(target, color=MUTED, linewidth=1, linestyle=(0, (4, 3)), zorder=1)
    ax.text(
        ax.get_xlim()[0],
        target,
        f" meta {decimal(target * 100, 0)} %",
        va="bottom",
        ha="left",
        fontsize=7,
        color=MUTED,
    )
    from matplotlib.ticker import MaxNLocator  # noqa: PLC0415 - optional dependency

    ax.yaxis.set_major_locator(MaxNLocator(steps=[1, 2, 5, 10]))
    ax.yaxis.set_major_formatter(lambda value, _pos: decimal(value))
    ax.xaxis.set_major_formatter(lambda value, _pos: decimal(value, 0))
    ax.grid(axis="y", color=GRID, linewidth=0.6)
    ax.set_xlabel("Inventario promedio (unidades por periodo)")
    ax.set_ylabel("Fill rate")
    ax.set_title(title, fontsize=9, loc="left")


def _stats_dir(paths: ProjectPaths, frequency: str, stage: Stage) -> Path:
    found = sorted((paths.runs.parent / "stats").glob(f"*-{stats_name(frequency, stage)}"))
    if not found:
        raise FigureInputError(f"no statistics for {frequency} ({stage}): run pcs run-stats")
    return found[-1]


def critical_difference_figure(paths: ProjectPaths, stage: Stage, out: Path) -> Path:
    plt = _pyplot()
    fig, grid = plt.subplots(4, 1, figsize=(7.2, 8.4))
    for row, frequency in enumerate(("weekly", "monthly")):
        table = pd.read_parquet(_stats_dir(paths, frequency, stage) / "he1_friedman.parquet")
        table = table[(table["channel"] == CHANNEL) & (table["horizon"] == 1)]
        for col, level in enumerate(("category", "sku")):
            ax = grid[2 * row + col]
            chosen = table[table["level"] == level]
            if chosen.empty:
                ax.axis("off")
                continue
            record = chosen.iloc[0]
            title = (
                f"{FREQUENCY_LABELS[frequency]}, {LEVEL_LABELS[level]} "
                f"({int(record['series'])} series)"
            )
            draw_critical_difference(
                ax,
                json.loads(record["mean_ranks"]),
                float(record["critical_difference"]),
                title,
            )
    fig.tight_layout()
    path = out / "critical_difference.png"
    fig.savefig(path, dpi=DPI, facecolor="white")
    plt.close(fig)
    return path


def service_stock_figure(
    paths: ProjectPaths, stage: Stage, out: Path, target: float = 0.95
) -> Path:
    plt = _pyplot()
    fig, axes = plt.subplots(2, 2, figsize=(7.2, 6.0), layout="constrained")
    for row, frequency in enumerate(("weekly", "monthly")):
        directory = latest_run(paths.runs, frequency, "inventory", stage=stage)
        simulation = pd.read_parquet(directory / "simulation.parquet")
        primary = simulation[(simulation["channel"] == CHANNEL) & simulation["primary_scenario"]]
        for col, level in enumerate(("category", "total")):
            frame = (
                primary[primary["level"] == level]
                .groupby("model", as_index=False)[["fill_rate", "mean_on_hand"]]
                .mean()
            )
            axes[row][col].label_frame = frame
            draw_service_stock(
                axes[row][col],
                frame,
                target,
                f"{FREQUENCY_LABELS[frequency]}, {LEVEL_LABELS[level]}",
            )
    handles = [
        plt.Line2D(
            [],
            [],
            color=FAMILY_STYLE[FAMILIES[name]][0],
            marker=FAMILY_STYLE[FAMILIES[name]][1],
            linestyle="",
            markersize=6,
            label=f"{MODEL_NUMBERS[name]}  {label}",
        )
        for name, label in MODEL_LABELS.items()
    ]
    fig.legend(handles=handles, loc="outside lower center", ncol=3, frameon=False, fontsize=7)
    fig.canvas.draw()  # final axes positions before placing the numbers
    for row_axes in axes:
        for ax in row_axes:
            place_labels(ax, ax.label_frame)
    path = out / "service_vs_stock.png"
    fig.savefig(path, dpi=DPI, facecolor="white")
    plt.close(fig)
    return path


def run_thesis_figures(paths: ProjectPaths, stage: Stage = "test") -> Path:
    """Write the figures to ``outputs/thesis/<timestamp>/figures``."""
    started = datetime.now(UTC)
    out = paths.root / "outputs" / "thesis" / f"{started:%Y%m%dT%H%M%SZ}-figures"
    out.mkdir(parents=True, exist_ok=False)
    files = [critical_difference_figure(paths, stage, out), service_stock_figure(paths, stage, out)]
    record = {
        "created_at": started.isoformat(timespec="seconds"),
        "stage": stage,
        "channel": CHANNEL,
        "files": [file.name for file in files],
    }
    (out / "figures.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return out
