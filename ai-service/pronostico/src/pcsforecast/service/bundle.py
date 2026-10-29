"""Deployment bundle: the served series and the final-test tables, for hosts without ``data/``.

``data/`` and ``outputs/`` never go to Git (company data), so a deployed ai-service has neither.
This command copies the aggregated monthly series the service reads (no customer appears in
them) and writes the final-test tables as ``research_results.json``:

    python -m pcsforecast.service.bundle /path/to/bundle

Upload the folder to a private volume of the host (Railway: a volume mounted on the ai-service)
and set ``PCS_SERVICE_SERIES`` to it.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from pcsforecast.paths import ProjectPaths, project_paths
from pcsforecast.service.data import read_served_panel, service_series_dir
from pcsforecast.service.research import PROFILE_FILE, export_snapshot

SERIES_FILES = (
    "panel_development.parquet",
    "sealed/panel_sealed.parquet",
    "catalog_skus.parquet",
    "category_labels.json",
    "manifest.json",
    PROFILE_FILE,
    "web/panel_web.parquet",
    "precomputed_quantiles.json",
)
# Written trimmed to the rows and columns the service reads (see data.SERVED_ROWS): the full
# panels (weekly rows, every channel) would cost the deployed service ~4x the RAM to decode.
PANEL_FILES = frozenset({"panel_development.parquet", "sealed/panel_sealed.parquet"})
REQUIRED_FILES = frozenset(
    {"panel_development.parquet", "catalog_skus.parquet", "category_labels.json"}
)


def build_bundle(target: Path, paths: ProjectPaths | None = None) -> list[Path]:
    """Copy the served series into ``target`` and add the final-test snapshot."""
    paths = paths or project_paths()
    source = service_series_dir(paths)
    written: list[Path] = []
    for name in SERIES_FILES:
        origin = source / name
        if not origin.is_file():
            if name in REQUIRED_FILES:
                raise FileNotFoundError(origin)
            continue
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        if name in PANEL_FILES:
            read_served_panel(origin).to_parquet(destination, index=False)
        else:
            shutil.copy2(origin, destination)
        written.append(destination)
    written.append(export_snapshot(paths, target))
    return written


if __name__ == "__main__":  # pragma: no cover
    if len(sys.argv) != 2:  # noqa: PLR2004
        sys.exit("Uso: python -m pcsforecast.service.bundle <carpeta-destino>")
    for path in build_bundle(Path(sys.argv[1]).resolve()):
        print(path)
