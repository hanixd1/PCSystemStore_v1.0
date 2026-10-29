"""Execution-environment fingerprint recorded with every run (experiment log, Table 19)."""

from __future__ import annotations

import os
import platform
import resource
import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

TRACKED_PACKAGES = (
    "pcsforecast",
    "numpy",
    "pandas",
    "pyarrow",
    "pydantic",
    "pandera",
    "statsforecast",
    "mlforecast",
    "lightgbm",
    "scikit-learn",
    "torch",
    "chronos-forecasting",
    "scipy",
)


def package_versions(names: tuple[str, ...] = TRACKED_PACKAGES) -> dict[str, str | None]:
    """Installed version of each package, or ``None`` if it is not installed."""
    versions: dict[str, str | None] = {}
    for name in names:
        try:
            versions[name] = version(name)
        except PackageNotFoundError:
            versions[name] = None
    return versions


def total_memory_gb() -> float | None:
    """Physical memory of the machine (GB), when the platform reports it."""
    try:
        return round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2**30, 1)
    except (ValueError, OSError, AttributeError):  # pragma: no cover - platform without sysconf
        return None


def environment_fingerprint() -> dict[str, object]:
    """Python, OS, CPU and package versions of the current process."""
    return {
        "python": platform.python_version(),
        "implementation": platform.python_implementation(),
        "system": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "processor": platform.processor() or None,
        "cpu_count": os.cpu_count(),
        "memory_total_gb": total_memory_gb(),
        "in_container": Path("/.dockerenv").exists(),
        "packages": package_versions(),
    }


def peak_memory_mb() -> dict[str, float]:
    """Peak resident memory (MB) of this process and of its finished child processes.

    ``ru_maxrss`` is in bytes on macOS and in kilobytes on Linux. Children are counted once they
    have ended (for example the Chronos worker, stopped at the end of a run).
    """
    unit = 1.0 if sys.platform == "darwin" else 1024.0
    return {
        "self": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * unit / 2**20, 1),
        "children": round(resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss * unit / 2**20, 1),
    }
