"""Project directory layout, resolved from ``PCS_PROJECT_ROOT`` or the working directory."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT_ENV_VAR = "PCS_PROJECT_ROOT"


@dataclass(frozen=True)
class ProjectPaths:
    """Well-known locations inside the project root."""

    root: Path

    @property
    def configs(self) -> Path:
        return self.root / "configs"

    @property
    def data(self) -> Path:
        return self.root / "data"

    @property
    def raw(self) -> Path:
        return self.data / "00_raw"

    @property
    def staged(self) -> Path:
        return self.data / "01_staged"

    @property
    def clean(self) -> Path:
        return self.data / "02_clean"

    @property
    def series(self) -> Path:
        return self.data / "03_series"

    @property
    def manifests(self) -> Path:
        return self.data / "04_manifests"

    @property
    def private(self) -> Path:
        return self.data / "private"

    @property
    def models_cache(self) -> Path:
        return self.root / "models_cache"

    @property
    def runs(self) -> Path:
        return self.root / "outputs" / "runs"

    @property
    def tuning(self) -> Path:
        return self.root / "outputs" / "tuning"


def project_paths(root: Path | None = None) -> ProjectPaths:
    """Return the layout for ``root``, the ``PCS_PROJECT_ROOT`` variable, or the cwd."""
    if root is None:
        root = Path(os.environ.get(ROOT_ENV_VAR, Path.cwd()))
    return ProjectPaths(root=root.resolve())
