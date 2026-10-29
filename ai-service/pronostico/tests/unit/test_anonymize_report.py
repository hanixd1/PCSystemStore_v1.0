from __future__ import annotations

import stat
from pathlib import Path

import pandas as pd
import pytest

from pcsforecast.audit.anonymize import Anonymizer, load_or_create_key
from pcsforecast.audit.report import reconcile_blocks


def test_codes_are_stable_and_distinct() -> None:
    first, second = Anonymizer(b"k" * 32), Anonymizer(b"k" * 32)
    assert first.code("ALFA") == second.code("ALFA")
    assert first.code("ALFA") != first.code("BETA")
    assert first.code(None) is None
    assert str(first.code("ALFA")).startswith("C")
    assert len(str(first.code("ALFA"))) == 11


def test_codes_depend_on_the_key() -> None:
    assert Anonymizer(b"a" * 32).code("ALFA") != Anonymizer(b"b" * 32).code("ALFA")


def test_short_keys_are_rejected() -> None:
    with pytest.raises(ValueError, match="32 bytes"):
        Anonymizer(b"short")


def test_mapping_lists_every_coded_name() -> None:
    anonymizer = Anonymizer(b"k" * 32)
    anonymizer.code("B")
    anonymizer.code("A")
    anonymizer.code("A")
    assert anonymizer.mapping()["customer_name"].tolist() == ["A", "B"]


def test_key_file_is_created_once_and_owner_only(tmp_path: Path) -> None:
    path = tmp_path / "private" / "anonymization.key"
    key = load_or_create_key(path)
    assert len(key) == 32
    assert load_or_create_key(path) == key
    assert stat.S_IMODE(path.stat().st_mode) == 0o600


def test_reconcile_blocks_statuses() -> None:
    staged = pd.DataFrame(
        {
            "sheet_index": [0, 0, 1, 2, 3],
            "block": [0, 0, 0, 0, 0],
            "row_kind": ["line", "line", "line", "line", "outside_block"],
            "monto_raw": ["100", "50", "10", "5", "999"],
        }
    )
    blocks = pd.DataFrame(
        {
            "sheet_index": [0, 1, 2, 3],
            "block": [0, 0, 0, 0],
            "total_row": pd.array([5, 3, None, 4], dtype="Int64"),
            "total_raw": ["150", "11", None, "TOTAL?"],
        }
    )
    result = reconcile_blocks(staged, blocks)
    assert result["status"].tolist() == ["match", "mismatch", "no_total_row", "total_not_numeric"]
    assert result["lines_sum"].tolist() == [150.0, 10.0, 5.0, 0.0]
