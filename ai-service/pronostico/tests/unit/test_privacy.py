from __future__ import annotations

import stat
from pathlib import Path

import pandas as pd

from pcsforecast.privacy import (
    ALLOWLIST_FILE,
    CODES_FILE,
    known_identifiers,
    open_anonymizer,
    save_codes,
    scan_for_identifiers,
    secure_private,
)


def _mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


def test_secure_private_restricts_folder_and_files(tmp_path: Path) -> None:
    private = tmp_path / "private"
    private.mkdir(mode=0o755)
    loose = private / "table.parquet"
    loose.write_bytes(b"x")
    loose.chmod(0o644)
    assert sorted(secure_private(private)) == ["private", "table.parquet"]
    assert (_mode(private), _mode(loose)) == (0o700, 0o600)
    assert secure_private(private) == []


def test_codes_are_saved_owner_only(tmp_path: Path) -> None:
    private = tmp_path / "private"
    anonymizer = open_anonymizer(private)
    anonymizer.code("ALFA")
    path = save_codes(anonymizer, private)
    assert _mode(path) == 0o600
    assert pd.read_parquet(path)["customer_name"].tolist() == ["ALFA"]


def _private_with(tmp_path: Path, names: list[str], allow: str = "") -> Path:
    private = tmp_path / "private"
    anonymizer = open_anonymizer(private)
    for name in names:
        anonymizer.code(name)
    save_codes(anonymizer, private)
    if allow:
        (private / ALLOWLIST_FILE).write_text(allow, encoding="utf-8")
    return private


def test_known_identifiers_skip_short_and_allowlisted_names(tmp_path: Path) -> None:
    private = _private_with(tmp_path, ["ALFA", "BOB", "TEROS"], allow="# reviewed\nteros\n")
    assert list(known_identifiers(private)) == ["ALFA"]
    assert known_identifiers(tmp_path / "empty") == {}


def test_scan_reports_file_field_and_code(tmp_path: Path) -> None:
    private = _private_with(tmp_path, ["ALFA", "BETA"])
    identifiers = known_identifiers(private)
    out = tmp_path / "out"
    out.mkdir()
    pd.DataFrame({"product": ["SSD ALFA 1TB", "RAM"], "units": [1, 2]}).to_parquet(
        out / "lines.parquet"
    )
    (out / "notes.md").write_text("Sold to beta and BETA.", encoding="utf-8")
    (out / "image.png").write_bytes(b"ALFA")
    (out / "clean.json").write_text('{"customer": "C0123456789"}', encoding="utf-8")
    findings = scan_for_identifiers([out], identifiers, tmp_path)
    found = {(f.file, f.field, f.customer_code, f.occurrences) for f in findings}
    assert found == {
        ("out/lines.parquet", "product", identifiers["ALFA"], 1),
        ("out/notes.md", "text", identifiers["BETA"], 2),
    }
    described = findings[0].describe(show_name=False)
    assert "ALFA" not in described
    assert "ALFA" in findings[0].describe(show_name=True)


def test_scan_without_identifiers(tmp_path: Path) -> None:
    assert scan_for_identifiers([tmp_path], {}, tmp_path) == []


def test_codes_file_name() -> None:
    assert CODES_FILE == "customer_codes.parquet"
