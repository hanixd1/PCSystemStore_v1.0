"""F1 steps for the retail channel: stage the registered receipts, then audit them."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pcsforecast.audit.receipts import audit_receipts, build_receipt_report, coverage_by_month
from pcsforecast.audit.report import render_markdown
from pcsforecast.audit.run import StepInputError
from pcsforecast.config import file_sha256
from pcsforecast.ingest.receipts import DeliveredReceipt, stage_receipts
from pcsforecast.manifest import StepManifest, read_manifest, verify_outputs
from pcsforecast.paths import ProjectPaths
from pcsforecast.privacy import open_anonymizer, save_retail_customers
from pcsforecast.schemas.receipts import StagedReceipt, StagedReceiptLine

RECEIPTS_SOURCE = "retail_receipts"
CHANNEL_DIR = "retail"
RECEIPTS_FILE = "receipts.parquet"
RECEIPT_LINES_FILE = "receipt_lines.parquet"


def _registered_receipts(paths: ProjectPaths) -> list[DeliveredReceipt]:
    changed = verify_outputs(paths.raw, paths.root)
    if changed:
        raise StepInputError(f"raw files differ from their registration: {changed}")
    source = paths.raw / RECEIPTS_SOURCE
    # Only the current registration: copies of files the owner no longer delivers stay read-only
    # in data/00_raw but are not read (e.g. a receipt re-filed under another folder).
    outputs = read_manifest(paths.raw)["outputs"]
    registered = (
        {paths.root / relative for relative in outputs} if isinstance(outputs, dict) else set()
    )
    files = sorted(f for f in source.rglob("*.pdf") if f in registered)
    if not files:
        raise StepInputError(f"no registered receipts in {source}; run pcs register-raw")
    return [DeliveredReceipt(f, f.relative_to(source).as_posix(), file_sha256(f)) for f in files]


def run_stage_receipts(paths: ProjectPaths) -> Path:
    """Read every registered receipt into ``data/01_staged/retail`` (customers as codes)."""
    delivered = _registered_receipts(paths)
    staged = stage_receipts(delivered, open_anonymizer(paths.private))
    save_retail_customers(staged.customers, paths.private)
    out = paths.staged / CHANNEL_DIR
    out.mkdir(parents=True, exist_ok=True)
    receipts = StagedReceipt.validate(
        pd.DataFrame(staged.receipts, columns=list(StagedReceipt.to_schema().columns))
    )
    lines = StagedReceiptLine.validate(
        pd.DataFrame(staged.lines, columns=list(StagedReceiptLine.to_schema().columns))
    )
    manifest = StepManifest(step="stage_receipts", root=paths.root)
    for item in delivered:
        manifest.add_input(item.path)
    manifest.write_parquet(receipts, out / RECEIPTS_FILE)
    manifest.write_parquet(lines, out / RECEIPT_LINES_FILE)
    manifest.details = {
        "receipt_files": len(receipts),
        "item_lines": len(lines),
        "with_reading_issues": int((receipts["issues"] != "").sum()),
    }
    return manifest.write(out)


def run_audit_receipts(paths: ProjectPaths) -> Path:
    """Validate, reconcile and clean the staged receipts into ``data/02_clean/retail``."""
    staged_dir = paths.staged / CHANNEL_DIR
    changed = verify_outputs(staged_dir, paths.root)
    if changed:
        raise StepInputError(f"staged receipts differ from their manifest: {changed}")
    receipts = pd.read_parquet(staged_dir / RECEIPTS_FILE)
    lines = pd.read_parquet(staged_dir / RECEIPT_LINES_FILE)
    audit = audit_receipts(receipts, lines)
    coverage = coverage_by_month(audit.receipts, audit.gaps)
    report = build_receipt_report(audit, coverage)

    out = paths.clean / CHANNEL_DIR
    out.mkdir(parents=True, exist_ok=True)
    manifest = StepManifest(step="audit_receipts", root=paths.root)
    for name in (RECEIPTS_FILE, RECEIPT_LINES_FILE):
        manifest.add_input(staged_dir / name)
    manifest.add_input(paths.configs / "data_rules.yaml")
    manifest.write_parquet(audit.receipts, out / RECEIPTS_FILE)
    manifest.write_parquet(audit.lines, out / "retail_lines.parquet")
    manifest.write_parquet(audit.corrections, out / "corrections.parquet")
    manifest.write_parquet(audit.gaps, out / "numbering_gaps.parquet")
    manifest.write_parquet(coverage, out / "coverage_by_month.parquet")
    report_json = out / "audit_report.json"
    report_json.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", "utf-8")
    manifest.add_output(report_json)
    report_md = out / "audit_report.md"
    report_md.write_text(render_markdown(report, "retail receipts"), encoding="utf-8")
    manifest.add_output(report_md)
    manifest.details = {
        "valid_receipts": report["completeness"]["valid_receipts"],
        "item_lines": report["completeness"]["item_lines"],
    }
    return manifest.write(out)
