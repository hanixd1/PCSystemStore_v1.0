"""Protection of personal data (Law 29733, ISO/IEC 27001 controls; rule R208).

* ``data/private/`` is the only place where customer names, the name-to-code table and the
  pseudonymisation key exist outside the delivered files. The folder is kept at mode 700 and its
  files at 600, and every step that writes there re-applies those modes.
* Customer names are replaced by keyed-hash codes at extraction, so no later table holds them.
* ``scan_for_identifiers`` searches every shareable output for the known names, reporting only
  the customer code of a hit, never the name itself.
"""

from __future__ import annotations

import re
import stat
from collections import Counter
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from pcsforecast.audit.anonymize import Anonymizer, load_or_create_key

KEY_FILE = "anonymization.key"
CODES_FILE = "customer_codes.parquet"
# Retail receipts: code, document type and number, and name of each customer (rule R306).
RETAIL_CUSTOMERS_FILE = "retail_customers.parquet"
# Names the owner reviewed and confirmed as ordinary words where they appear (e.g. a shop named
# after a brand that also appears in product descriptions). Kept private, one name per line.
ALLOWLIST_FILE = "privacy_allowlist.txt"
DIRECTORY_MODE = stat.S_IRWXU
FILE_MODE = stat.S_IRUSR | stat.S_IWUSR
MIN_NAME_LENGTH = 4
TEXT_SUFFIXES = (".json", ".md", ".txt")
# A DNI (8 digits) or RUC (11 digits) stored as a whole value of a customer column.
DOCUMENT_NUMBER = re.compile(r"^(?:\d{8}|\d{11})$")


def secure_private(directory: Path) -> list[str]:
    """Create ``directory`` if needed and restrict it to the owner; return what was changed."""
    directory.mkdir(parents=True, exist_ok=True)
    changed: list[str] = []
    for path, mode in [(directory, DIRECTORY_MODE)] + [
        (child, FILE_MODE) for child in sorted(directory.iterdir()) if child.is_file()
    ]:
        if stat.S_IMODE(path.stat().st_mode) != mode:
            path.chmod(mode)
            changed.append(path.name)
    return changed


def open_anonymizer(directory: Path) -> Anonymizer:
    """Anonymizer with the private key, creating the key on first use."""
    secure_private(directory)
    return Anonymizer(load_or_create_key(directory / KEY_FILE))


def save_codes(anonymizer: Anonymizer, directory: Path) -> Path:
    """Store the name-to-code table in the private folder, owner-only."""
    path = directory / CODES_FILE
    anonymizer.mapping().to_parquet(path, index=False)
    secure_private(directory)
    return path


def allowlisted(directory: Path) -> set[str]:
    """Names confirmed by the owner as ordinary words in the places they appear."""
    path = directory / ALLOWLIST_FILE
    if not path.is_file():
        return set()
    lines = path.read_text(encoding="utf-8").splitlines()
    return {line.strip().upper() for line in lines if line.strip() and not line.startswith("#")}


def save_retail_customers(rows: Iterable[Mapping[str, object]], directory: Path) -> Path:
    """Store the retail customers' identity (name, DNI/RUC → code) in the private folder."""
    path = directory / RETAIL_CUSTOMERS_FILE
    columns = ["customer_code", "doc_type", "doc_number", "customer_name"]
    pd.DataFrame(list(rows), columns=columns).to_parquet(path, index=False)
    secure_private(directory)
    return path


def known_identifiers(directory: Path) -> dict[str, str]:
    """Customer names and DNI/RUC numbers to search for (not allowlisted) → customer code.

    Names shorter than ``MIN_NAME_LENGTH`` characters are skipped (too many false matches).
    """
    allowed = allowlisted(directory)
    identifiers: dict[str, str] = {}
    codes = directory / CODES_FILE
    if codes.is_file():
        table = pd.read_parquet(codes)
        identifiers.update(zip(table["customer_name"], table["customer_code"], strict=True))
    retail = directory / RETAIL_CUSTOMERS_FILE
    if retail.is_file():
        table = pd.read_parquet(retail)
        for column in ("customer_name", "doc_number"):
            known = table.dropna(subset=[column])
            identifiers.update(zip(known[column], known["customer_code"], strict=True))
    return {
        str(name): str(code)
        for name, code in identifiers.items()
        if len(str(name)) >= MIN_NAME_LENGTH and str(name) not in allowed
    }


@dataclass(frozen=True)
class Finding:
    file: str
    field: str
    customer_code: str
    occurrences: int
    name: str

    def describe(self, show_name: bool) -> str:
        who = f"{self.customer_code} = {self.name}" if show_name else self.customer_code
        return f"{self.file} [{self.field}]: customer {who} ({self.occurrences} occurrences)"


def _texts(path: Path) -> Iterable[tuple[str, Iterable[str]]]:
    """(field, texts) pairs of a file: one per text column of a table, or the whole file."""
    if path.suffix == ".parquet":
        frame = pd.read_parquet(path)
        for column in frame.columns:
            if pd.api.types.is_string_dtype(frame[column]):
                yield str(column), frame[column].dropna().astype(str).unique()
    elif path.suffix in TEXT_SUFFIXES:
        yield "text", [path.read_text(encoding="utf-8", errors="replace")]


def scan_for_identifiers(
    roots: Iterable[Path], identifiers: Mapping[str, str], base: Path
) -> list[Finding]:
    """Occurrences of known customer names (whole words) in the files under ``roots``."""
    if not identifiers:
        return []
    names = sorted(identifiers, key=len, reverse=True)
    pattern = re.compile(r"\b(" + "|".join(re.escape(n) for n in names) + r")\b")
    findings: list[Finding] = []
    for root in roots:
        files = [root] if root.is_file() else sorted(p for p in root.rglob("*") if p.is_file())
        for path in files:
            for field, texts in _texts(path):
                hits: Counter[str] = Counter()
                for text in texts:
                    hits.update(pattern.findall(text.upper()))
                findings.extend(
                    Finding(path.relative_to(base).as_posix(), field, identifiers[n], count, n)
                    for n, count in sorted(hits.items())
                )
    return findings


def scan_for_document_numbers(roots: Iterable[Path], base: Path) -> list[Finding]:
    """Customer columns of tables that hold a bare DNI or RUC instead of a code."""
    findings: list[Finding] = []
    for root in roots:
        files = [root] if root.is_file() else sorted(root.rglob("*.parquet"))
        for path in files:
            if path.suffix != ".parquet":
                continue
            frame = pd.read_parquet(path)
            for column in (c for c in frame.columns if "customer" in str(c)):
                values = frame[column].dropna().astype(str)
                count = int(values.str.match(DOCUMENT_NUMBER).sum())
                if count:
                    rel = path.relative_to(base).as_posix()
                    findings.append(Finding(rel, str(column), "DNI/RUC", count, "DNI/RUC"))
    return findings
