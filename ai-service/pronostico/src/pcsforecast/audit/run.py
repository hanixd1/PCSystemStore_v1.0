"""F1 pipeline steps: stage the raw workbook, then audit and clean it."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pcsforecast.audit.cleaning import clean_lines
from pcsforecast.audit.report import build_audit_report, reconcile_blocks, render_markdown
from pcsforecast.audit.sheet_dates import resolve_sheet_dates
from pcsforecast.config import (
    DataRulesConfig,
    SheetDateOverridesConfig,
    file_sha256,
)
from pcsforecast.ingest.vecinos_workbook import stage_workbook
from pcsforecast.manifest import StepManifest, read_manifest, verify_outputs
from pcsforecast.paths import ProjectPaths
from pcsforecast.privacy import open_anonymizer, save_codes
from pcsforecast.text import normalize_text

VECINOS_SOURCE = "vecinos_daily_sheets"
SHEETS_FILE = "vecinos_sheets.parquet"
BLOCKS_FILE = "vecinos_blocks.parquet"
LINES_FILE = "vecinos_lines.parquet"
STAGED_FILES = (SHEETS_FILE, BLOCKS_FILE, LINES_FILE)


class StepInputError(RuntimeError):
    """A step's inputs are missing or differ from what the previous step handed over."""


def _vecinos_raw_file(paths: ProjectPaths) -> Path:
    changed = verify_outputs(paths.raw, paths.root)
    if changed:
        raise StepInputError(f"raw files differ from their registration: {changed}")
    files = sorted((paths.raw / VECINOS_SOURCE).glob("*.xlsx"))
    if len(files) != 1:
        raise StepInputError(f"expected one registered vecinos workbook, found {len(files)}")
    return files[0]


def run_stage(paths: ProjectPaths) -> Path:
    """Extract the registered vecinos workbook into ``data/01_staged``."""
    raw_file = _vecinos_raw_file(paths)
    digest = file_sha256(raw_file)
    anonymizer = open_anonymizer(paths.private)
    staged = stage_workbook(raw_file, digest, anonymizer)
    save_codes(anonymizer, paths.private)
    out = paths.staged
    out.mkdir(parents=True, exist_ok=True)
    manifest = StepManifest(step="stage_vecinos", root=paths.root)
    manifest.add_input(raw_file)
    manifest.write_parquet(staged.sheets, out / SHEETS_FILE)
    manifest.write_parquet(staged.blocks, out / BLOCKS_FILE)
    manifest.write_parquet(staged.lines, out / LINES_FILE)
    manifest.details = {
        "source_sha256": digest,
        "sheets": len(staged.sheets),
        "blocks": len(staged.blocks),
        "rows": len(staged.lines),
    }
    return manifest.write(out)


def run_audit(
    paths: ProjectPaths, rules: DataRulesConfig, overrides: SheetDateOverridesConfig
) -> Path:
    """Resolve dates, clean and audit the pseudonymised staged lines into data/02_clean."""
    changed = verify_outputs(paths.staged, paths.root)
    if changed:
        raise StepInputError(f"staged files differ from the stage manifest: {changed}")
    staged_dir = paths.staged
    sheets = pd.read_parquet(staged_dir / SHEETS_FILE)
    blocks = pd.read_parquet(staged_dir / BLOCKS_FILE)
    staged = pd.read_parquet(staged_dir / LINES_FILE)

    has_product = staged["producto_raw"].map(normalize_text).notna()
    sheet_dates = resolve_sheet_dates(
        sheets, set(staged.loc[has_product, "sheet_index"]), overrides.overrides
    )
    result = clean_lines(staged, sheet_dates, rules.movement_lookup(), rules.empty_code_type)
    reconciliation = reconcile_blocks(staged, blocks)

    stage_manifest = read_manifest(staged_dir)
    details = stage_manifest["details"]
    if not isinstance(details, dict):
        raise StepInputError("malformed stage manifest")
    raw_inputs = stage_manifest["inputs"]
    if not isinstance(raw_inputs, dict):
        raise StepInputError("malformed stage manifest")
    report = build_audit_report(
        source={"file": next(iter(raw_inputs)), "sha256": details["source_sha256"]},
        sheets=sheets,
        sheet_dates=sheet_dates,
        staged=staged,
        reconciliation=reconciliation,
        clean=result.lines,
        corrections=result.corrections,
        movement_confirmed={k: v.confirmed for k, v in rules.movement_types.items()},
    )

    out = paths.clean
    out.mkdir(parents=True, exist_ok=True)
    manifest = StepManifest(step="audit_vecinos", root=paths.root)
    for name in STAGED_FILES:
        manifest.add_input(staged_dir / name)
    for config in ("data_rules.yaml", "sheet_date_overrides.yaml"):
        manifest.add_input(paths.configs / config)
    manifest.write_parquet(sheet_dates, out / "vecinos_sheet_dates.parquet")
    manifest.write_parquet(result.lines, out / LINES_FILE)
    manifest.write_parquet(result.corrections, out / "corrections.parquet")
    manifest.write_parquet(reconciliation, out / "reconciliation.parquet")
    report_json = out / "audit_report.json"
    report_json.write_text(
        json.dumps(report, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8"
    )
    manifest.add_output(report_json)
    report_md = out / "audit_report.md"
    report_md.write_text(render_markdown(report), encoding="utf-8")
    manifest.add_output(report_md)

    manifest.details = {
        "valid_lines": report["completeness"]["valid_lines"],
        "corrections": len(result.corrections),
    }
    return manifest.write(out)
