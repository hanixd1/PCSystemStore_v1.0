"""Thesis results for the admin dashboard: final-test accuracy, inventory service and decisions.

Reads the single opening of the frozen final test (F9) and never recomputes anything. The run
records live in ``outputs/runs``, which never leaves the research machine; deployments read the
same tables from ``research_results.json`` next to the served series (``export_snapshot``).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from pcsforecast.paths import ProjectPaths
from pcsforecast.reporting.dashboard_data import leaderboard, service_inventory
from pcsforecast.service.data import CHANNEL, FREQUENCY, SeriesStore

MAIN_HORIZON = 1
LEAD_TIME = 1
FILL_RATE_TARGET = 0.95
SNAPSHOT_FILE = "research_results.json"
PROFILE_FILE = "profile.parquet"
# Versioned copy of the freeze record, used when data/04_manifests is not present (deployments).
FREEZE_DOC = Path("docs") / "freeze" / "FREEZE.json"

MODEL_LABELS = {
    "naive": "Ingenuo",
    "ses": "SES",
    "croston": "Croston",
    "sba": "SBA",
    "tsb": "TSB",
    "two_stage_trees": "Árboles en dos etapas",
    "global_gbm": "LightGBM global",
    "chronos_zero_shot": "Chronos (zero-shot)",
    "chronos_fine_tuned": "Chronos (ajuste ligero)",
}
PATTERN_LABELS = {
    "smooth": "Suave",
    "erratic": "Errática",
    "intermittent": "Intermitente",
    "lumpy": "Irregular",
    "no_demand": "Sin demanda",
}
# Decisions of the frozen opening (docs/phases/f10_contrast_and_results.md).
HYPOTHESES = [
    {
        "id": "HG",
        "decision": "Aceptada",
        "statement": "Los modelos difieren en exactitud, nivel de servicio y robustez.",
        "evidence": "32/32 estratos de exactitud, 45/64 de fill rate y 53/64 de robustez.",
    },
    {
        "id": "HE1",
        "decision": "Aceptada",
        "statement": "Exactitud según el nivel de agregación.",
        "evidence": (
            "Chronos con ajuste ligero es el mejor en categorías y serie total; el ingenuo "
            "gana por rango en SKU intermitentes."
        ),
    },
    {
        "id": "HE2",
        "decision": "Parcialmente aceptada",
        "statement": "La exactitud no garantiza el mejor nivel de servicio.",
        "evidence": (
            "El inventario difiere en frecuencia mensual; la correlación de Spearman entre el "
            "ranking por MASE y por fill rate es negativa en todos los estratos."
        ),
    },
    {
        "id": "HE3",
        "decision": "Aceptada",
        "statement": "Robustez ante historial truncado y ventana expansiva.",
        "evidence": "El ranking es estable entre desarrollo y prueba (rho 0,87-0,98).",
    },
]


def _json(path: Path) -> dict[str, Any]:
    data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return data


def _latest_test_run(runs: Path, data_file: str) -> tuple[str, dict[str, Any], pd.DataFrame] | None:
    found = None
    if not runs.is_dir():
        return None
    for directory in sorted(runs.iterdir()):
        record_path = directory / "run.json"
        if not (record_path.is_file() and (directory / data_file).is_file()):
            continue
        record = _json(record_path)
        if (
            record.get("frequency") == FREQUENCY
            and record.get("stage") == "test"
            and record.get("condition", "full") == "full"
        ):
            found = (directory.name, record, pd.read_parquet(directory / data_file))
    return found


def _label(model: str) -> str:
    return MODEL_LABELS.get(model, model)


def _accuracy(runs: Path) -> dict[str, Any] | None:
    found = _latest_test_run(runs, "metrics.parquet")
    if found is None:
        return None
    run_id, record, metrics = found
    table = leaderboard(metrics[metrics["channel"] == CHANNEL], MAIN_HORIZON)
    rows = [
        {
            "level": str(row["level"]),
            "model": str(row["model"]),
            "label": _label(str(row["model"])),
            "series": int(row["series"]),
            "medianMase": round(float(row["median_mase"]), 3),
            "medianRmsse": round(float(row["median_rmsse"]), 3),
            "meanRank": round(float(row["mean_rank"]), 2),
            "shareBeatsNaive": round(float(row["share_beats_naive"]), 3),
        }
        for row in table.to_dict("records")
    ]
    return {
        "runId": run_id,
        "origins": record.get("origins"),
        "testWindow": record.get("test_window"),
        "rows": rows,
    }


def _inventory(runs: Path) -> dict[str, Any] | None:
    found = _latest_test_run(runs, "simulation.parquet")
    if found is None:
        return None
    run_id, _, simulation = found
    table = service_inventory(
        simulation[simulation["channel"] == CHANNEL], LEAD_TIME, FILL_RATE_TARGET
    )
    rows = [
        {
            "level": str(row["level"]),
            "model": str(row["model"]),
            "label": _label(str(row["model"])),
            "fillRate": None if pd.isna(row["fill_rate"]) else round(float(row["fill_rate"]), 4),
            "meanOnHand": round(float(row["mean_on_hand"]), 2),
            "lostUnits": round(float(row["lost_units"]), 1),
            "lostValue": round(float(row["lost_value"]), 2),
        }
        for row in table.to_dict("records")
    ]
    return {
        "runId": run_id,
        "leadTime": LEAD_TIME,
        "fillRateTarget": FILL_RATE_TARGET,
        "rows": rows,
    }


def _patterns(paths: ProjectPaths, store: SeriesStore) -> list[dict[str, Any]]:
    """Demand patterns of the served series (their own profile, else the frozen one)."""
    candidates = (store.source / PROFILE_FILE, paths.series / PROFILE_FILE)
    profile_path = next((path for path in candidates if path.is_file()), None)
    if profile_path is None:
        return []
    profile = pd.read_parquet(profile_path)
    chosen = profile[
        (profile["frequency"] == FREQUENCY) & (profile["channel"] == CHANNEL) & profile["selected"]
    ]
    counts = chosen.groupby(["level", "pattern"]).size().rename("series").reset_index()
    return [
        {
            "level": str(row["level"]),
            "pattern": str(row["pattern"]),
            "label": PATTERN_LABELS.get(str(row["pattern"]), str(row["pattern"])),
            "series": int(row["series"]),
        }
        for row in counts.to_dict("records")
    ]


def _freeze(paths: ProjectPaths) -> dict[str, Any]:
    for path in (paths.manifests / "FREEZE.json", paths.root / FREEZE_DOC):
        if path.is_file():
            return _json(path)
    return {}


def _snapshot(store: SeriesStore) -> dict[str, Any]:
    path = store.source / SNAPSHOT_FILE
    return _json(path) if path.is_file() else {}


def export_snapshot(paths: ProjectPaths, directory: Path) -> Path:
    """Write the final-test tables into ``directory``, for hosts without ``outputs``."""
    target = directory / SNAPSHOT_FILE
    snapshot = {"accuracy": _accuracy(paths.runs), "inventory": _inventory(paths.runs)}
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def research_summary(paths: ProjectPaths, store: SeriesStore) -> dict[str, Any]:
    sources = store.sources()
    total = store.history("total", "ALL")
    freeze = _freeze(paths)
    snapshot = _snapshot(store)
    return {
        "data": {
            "firstMonth": store.first_month.strftime("%Y-%m"),
            "lastMonth": store.last_month.strftime("%Y-%m"),
            "recordEnd": store.record_end,
            "months": len(store.months),
            "units": int(total["units"].sum()),
            "amount": round(float(total["amount"].sum()), 2),
            "skus": len(store.sku_names),
            "categories": len(store.category_labels),
            "structuralBreak": "2025-05",
        },
        "sources": [
            {"month": month, "channel": str(channel), "units": int(units)}
            for month, channel, units in zip(
                sources["period_start"].dt.strftime("%Y-%m").tolist(),
                sources["channel"].tolist(),
                sources["units"].tolist(),
                strict=True,
            )
        ],
        "freeze": {"tag": freeze.get("tag"), "frozenAt": freeze.get("frozen_at")},
        "accuracy": _accuracy(paths.runs) or snapshot.get("accuracy"),
        "inventory": _inventory(paths.runs) or snapshot.get("inventory"),
        "patterns": _patterns(paths, store),
        "hypotheses": HYPOTHESES,
    }
