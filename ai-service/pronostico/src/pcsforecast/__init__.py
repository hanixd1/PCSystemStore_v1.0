"""Comparative demand-forecasting system for PCSystemStore."""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("pcsforecast")
except PackageNotFoundError:  # pragma: no cover - loaded from source (ai-service in production)
    __version__ = "0.1.0"
