"""F8: freeze the research configuration before the final test is opened (plan 2.6, phase 3).

``pcs freeze --check`` lists what still blocks the freeze; ``pcs freeze --commit <sha>`` writes
``FREEZE.json`` only when nothing does. The record fixes, by SHA-256: every configuration file,
the lockfile, every step manifest of ``data/`` (raw copies, staged, clean, series, sealed test
panel) and the pinned pretrained weights, plus the accounting reconciliation, the code commit and
the environment. ``assert_unsealed`` (``protocol/origins.py``) opens the test only against a
frozen record whose configuration hashes still match.

Git is driven by ``scripts/freeze.sh`` (clean tree, commit, tag); this module only reads
``.git`` to confirm that the commit given is the checked-out one.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from pcsforecast import __version__
from pcsforecast.config import (
    CONFIG_FILES,
    ModelsConfig,
    Status,
    StrictModel,
    file_sha256,
    load_config,
    load_project_config,
)
from pcsforecast.manifest import MANIFEST_NAME, read_manifest, verify_outputs
from pcsforecast.paths import ProjectPaths
from pcsforecast.protocol.origins import FREEZE_FILE
from pcsforecast.runtime import environment_fingerprint

AUDIT_REPORT = "audit_report.json"
FROZEN_COPY = Path("docs") / "freeze" / FREEZE_FILE
RECORD_NAMES = ("run.json", "tuning.json", "stats.json")


class FreezeError(RuntimeError):
    """The configuration cannot be frozen yet."""


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    detail: str


def git_head(root: Path) -> str | None:
    """Commit checked out in ``root`` (read from ``.git``; ``None`` outside a repository)."""
    git = root / ".git"
    head_file = git / "HEAD"
    if not head_file.is_file():
        return None
    head = head_file.read_text(encoding="utf-8").strip()
    if not head.startswith("ref: "):
        return head
    ref = head.removeprefix("ref: ")
    loose = git / ref
    if loose.is_file():
        return loose.read_text(encoding="utf-8").strip()
    packed = git / "packed-refs"
    if packed.is_file():
        for line in packed.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) == 2 and parts[1] == ref:  # noqa: PLR2004 - "<sha> <ref>"
                return parts[0]
    return None


def _config_statuses(paths: ProjectPaths) -> tuple[dict[str, str], list[str]]:
    statuses: dict[str, str] = {}
    problems: list[str] = []
    for name, model in CONFIG_FILES.items():
        path = paths.configs / name
        try:
            loaded: StrictModel = load_config(path, model)
        except (OSError, ValueError) as error:
            problems.append(f"{name}: {error}")
            continue
        statuses[name] = str(getattr(loaded, "status", ""))
    return statuses, problems


def step_manifests(paths: ProjectPaths) -> list[Path]:
    """Directories of ``data/`` with a step manifest (``data/private`` excluded)."""
    return sorted(
        manifest.parent
        for manifest in paths.data.rglob(MANIFEST_NAME)
        if paths.private not in manifest.parents
    )


def _weights(paths: ProjectPaths, models: ModelsConfig) -> dict[str, dict[str, object]]:
    """Files and hashes of every pinned pretrained snapshot in the cache (missing: no files)."""
    pinned: dict[str, dict[str, object]] = {}
    for spec in models.families.get("pretrained", []):
        if not (spec.hf_repo and spec.hf_revision):
            continue
        folder = "models--" + spec.hf_repo.replace("/", "--")
        snapshot = paths.models_cache / "hub" / folder / "snapshots" / spec.hf_revision
        files = (
            {p.name: file_sha256(p) for p in sorted(snapshot.iterdir()) if p.is_file()}
            if snapshot.is_dir()
            else {}
        )
        pinned[spec.name] = {"repo": spec.hf_repo, "revision": spec.hf_revision, "files": files}
    return pinned


def _records(paths: ProjectPaths) -> Iterable[tuple[Path, dict[str, object]]]:
    outputs = paths.root / "outputs"
    for name in RECORD_NAMES:
        for path in sorted(outputs.rglob(name)):
            yield path, json.loads(path.read_text(encoding="utf-8"))


def reconciliation(paths: ProjectPaths) -> tuple[bool, str, dict[str, object]]:
    """Accounting reconciliation required by plan 2.5.2 A (amendment v4).

    Every delivered fiscal receipt must reproduce its printed total (100 %). The vecinos record
    is not fiscal: each daily block is checked against its TOTAL row and every exception is
    reported, so it does not block the freeze.
    """
    retail_path = paths.clean / "retail" / AUDIT_REPORT
    vecinos_path = paths.clean / AUDIT_REPORT
    if not retail_path.is_file() or not vecinos_path.is_file():
        return False, "audit reports missing (run pcs audit and pcs audit-receipts)", {}
    retail = json.loads(retail_path.read_text(encoding="utf-8"))
    vecinos = json.loads(vecinos_path.read_text(encoding="utf-8"))
    receipts = int(retail["completeness"]["valid_receipts"])
    reconciled = int(retail["consistency"]["receipts_reconciled_within_tolerance"])
    blocks = dict(vecinos["consistency"]["reconciliation"])
    summary: dict[str, object] = {
        "receipts": receipts,
        "receipts_reconciled": reconciled,
        "max_receipt_gap": retail["consistency"]["max_abs_reconciliation_gap"],
        "vecinos_blocks": blocks,
    }
    detail = (
        f"receipts {reconciled}/{receipts}; vecinos blocks matching "
        f"{blocks.get('match', 0)}/{sum(blocks.values())} (exceptions reported)"
    )
    return receipts > 0 and reconciled == receipts, detail, summary


def readiness(paths: ProjectPaths, commit: str | None = None) -> list[Check]:
    """Every condition of the freeze, passed or not, with a short explanation."""
    checks: list[Check] = []
    statuses, problems = _config_statuses(paths)
    draft = sorted(name for name, status in statuses.items() if status != Status.FROZEN)
    notes = [*problems, *([f"still draft: {', '.join(draft)}"] if draft else [])]
    checks.append(Check("configs_frozen", not notes, "; ".join(notes) or "all frozen"))
    changed = [
        f"{d.relative_to(paths.root)}: {item}"
        for d in step_manifests(paths)
        for item in verify_outputs(d, paths.root)
    ]
    sealed = paths.series / "sealed" / "panel_sealed.parquet"
    checks.append(
        Check(
            "data_manifests",
            not changed and sealed.is_file(),
            "; ".join(changed)
            or ("sealed test panel missing" if not sealed.is_file() else "all outputs match"),
        )
    )
    weights = _weights(paths, load_project_config(paths.configs, ModelsConfig))
    missing = sorted(name for name, entry in weights.items() if not entry["files"])
    checks.append(
        Check(
            "pretrained_weights",
            not missing,
            f"not cached: {', '.join(missing)}" if missing else f"{len(weights)} pinned and cached",
        )
    )
    reconciled, detail, _ = reconciliation(paths)
    checks.append(Check("reconciliation", reconciled, detail))
    used = [str(p.relative_to(paths.root)) for p, r in _records(paths) if r.get("test_span_used")]
    checks.append(
        Check(
            "test_span_unused",
            not used,
            f"test span used by: {', '.join(used)}" if used else "no record used the test span",
        )
    )
    head = git_head(paths.root)
    if commit is not None:
        checks.append(Check("commit", head == commit, f"checked out {head}, given {commit}"))
    return checks


def _latest_runs(paths: ProjectPaths) -> dict[str, str]:
    latest: dict[str, str] = {}
    for path, record in _records(paths):
        key = "-".join(
            str(record.get(field, ""))
            for field in ("mode", "frequency", "condition")
            if record.get(field)
        )
        latest[key or path.parent.name] = path.parent.name
    return dict(sorted(latest.items()))


def write_freeze(paths: ProjectPaths, commit: str, tag: str) -> Path:
    """Write ``FREEZE.json`` (and its versioned copy) when every check passes."""
    checks = readiness(paths, commit)
    blocking = [check for check in checks if not check.passed]
    if blocking:
        raise FreezeError("; ".join(f"{c.name}: {c.detail}" for c in blocking))
    _, _, reconciled = reconciliation(paths)
    series = read_manifest(paths.series)
    details = series.get("details", {})
    windows = details.get("windows", {}) if isinstance(details, dict) else {}
    record = {
        "status": "frozen",
        "frozen_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "tag": tag,
        "commit": commit,
        "package_version": __version__,
        "final_test": {"start": windows.get("test_start"), "end": windows.get("test_end")},
        "configs": {name: file_sha256(paths.configs / name) for name in CONFIG_FILES},
        "lockfile": {"uv.lock": file_sha256(paths.root / "uv.lock")},
        "data_manifests": {
            str(d.relative_to(paths.root)): file_sha256(d / MANIFEST_NAME)
            for d in step_manifests(paths)
        },
        "sealed_test_panel": file_sha256(paths.series / "sealed" / "panel_sealed.parquet"),
        "pretrained": _weights(paths, load_project_config(paths.configs, ModelsConfig)),
        "reconciliation": reconciled,
        "development_runs": _latest_runs(paths),
        "checks": [c.__dict__ for c in checks],
        "test_span_used": False,
        "environment": environment_fingerprint(),
    }
    text = json.dumps(record, indent=2, ensure_ascii=False) + "\n"
    paths.manifests.mkdir(parents=True, exist_ok=True)
    out = paths.manifests / FREEZE_FILE
    if out.exists():
        raise FreezeError(f"{out} already exists: the configuration is frozen")
    out.write_text(text, encoding="utf-8")
    copy = paths.root / FROZEN_COPY
    copy.parent.mkdir(parents=True, exist_ok=True)
    copy.write_text(text, encoding="utf-8")
    return out
