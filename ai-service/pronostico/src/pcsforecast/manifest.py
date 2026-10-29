"""Step manifests: which inputs (by hash) produced which outputs (by hash).

Each pipeline step writes ``manifest.json`` next to its outputs so the next phase can verify
that it consumes exactly what the previous one handed over.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pcsforecast import __version__
from pcsforecast.config import file_sha256

MANIFEST_NAME = "manifest.json"


@dataclass
class StepManifest:
    """Inputs, outputs and parameters of one pipeline step."""

    step: str
    root: Path
    inputs: dict[str, str] = field(default_factory=dict)
    outputs: dict[str, str] = field(default_factory=dict)
    details: dict[str, object] = field(default_factory=dict)

    def add_input(self, path: Path) -> None:
        self.inputs[self._relative(path)] = file_sha256(path)

    def add_output(self, path: Path) -> None:
        self.outputs[self._relative(path)] = file_sha256(path)

    def write_parquet(self, frame: pd.DataFrame, path: Path) -> None:
        """Write ``frame`` to ``path`` and record it as an output of the step."""
        path.parent.mkdir(parents=True, exist_ok=True)
        frame.to_parquet(path, index=False)
        self.add_output(path)

    def write(self, directory: Path) -> Path:
        payload = {
            "step": self.step,
            "package_version": __version__,
            "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "inputs": dict(sorted(self.inputs.items())),
            "outputs": dict(sorted(self.outputs.items())),
            "details": self.details,
        }
        path = directory / MANIFEST_NAME
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return path

    def _relative(self, path: Path) -> str:
        return path.resolve().relative_to(self.root.resolve()).as_posix()


def read_manifest(directory: Path) -> dict[str, object]:
    """Load the manifest written in ``directory``."""
    data: dict[str, object] = json.loads((directory / MANIFEST_NAME).read_text(encoding="utf-8"))
    return data


def verify_outputs(directory: Path, root: Path) -> list[str]:
    """Paths listed as outputs in ``directory``'s manifest whose current hash differs."""
    outputs = read_manifest(directory)["outputs"]
    if not isinstance(outputs, dict):
        raise TypeError(f"malformed manifest in {directory}")
    return [
        relative
        for relative, digest in outputs.items()
        if not (root / relative).is_file() or file_sha256(root / relative) != digest
    ]
