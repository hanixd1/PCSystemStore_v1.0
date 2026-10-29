"""Read-only copies of delivered files with a SHA-256 manifest (plan 2.5.2-C, step 2)."""

from __future__ import annotations

import shutil
import stat
from dataclasses import dataclass
from pathlib import Path

from pcsforecast.config import DataRulesConfig, file_sha256
from pcsforecast.manifest import StepManifest
from pcsforecast.paths import ProjectPaths

READ_ONLY = stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH


class RawRegistryError(RuntimeError):
    """A delivered file conflicts with an already registered raw copy."""


@dataclass(frozen=True)
class RawFile:
    source_id: str
    channel: str
    path: Path
    sha256: str
    size_bytes: int


def register_raw_sources(paths: ProjectPaths, rules: DataRulesConfig) -> list[RawFile]:
    """Copy every delivered file matching a source glob into ``data/00_raw/<source_id>/``.

    Copies are made read-only. Re-registering an identical file is a no-op; a different file
    under an existing name is refused, because raw data must never change silently.
    """
    delivery = paths.root / rules.delivery_dir
    manifest = StepManifest(step="register_raw", root=paths.root)
    registered: list[RawFile] = []
    for source in rules.sources:
        target_dir = paths.raw / source.id
        target_dir.mkdir(parents=True, exist_ok=True)
        for delivered in sorted(delivery.glob(source.file_glob)):
            # Sub-folders of the delivery (e.g. year/month) are kept as provenance.
            target = target_dir / delivered.relative_to(delivery)
            target.parent.mkdir(parents=True, exist_ok=True)
            digest = file_sha256(delivered)
            if target.exists():
                if file_sha256(target) != digest:
                    raise RawRegistryError(
                        f"{target} already registered with different content; "
                        "deliver the new version under a new file name"
                    )
            else:
                shutil.copy2(delivered, target)
                target.chmod(READ_ONLY)
            manifest.add_input(delivered)
            manifest.add_output(target)
            registered.append(
                RawFile(source.id, source.channel, target, digest, target.stat().st_size)
            )
    current = {f.path for f in registered}
    withdrawn = sorted(
        path.relative_to(paths.raw).as_posix()
        for source in rules.sources
        for path in (paths.raw / source.id).rglob("*")
        if path.is_file() and path not in current
    )
    manifest.details["withdrawn"] = withdrawn  # earlier copies no longer delivered: not read
    manifest.details["files"] = [
        {"source_id": f.source_id, "channel": f.channel, "size_bytes": f.size_bytes}
        for f in registered
    ]
    paths.raw.mkdir(parents=True, exist_ok=True)
    manifest.write(paths.raw)
    return registered
