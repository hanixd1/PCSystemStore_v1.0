"""Customer pseudonymisation with a keyed hash (rule R208).

Codes are stable across runs and cannot be reversed without the key, which lives with the
name-to-code table in ``data/private/`` and never in the analytical data set.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import stat
from pathlib import Path

import pandas as pd

KEY_BYTES = 32
CODE_HEX_CHARS = 10


class Anonymizer:
    """Maps normalised customer names to ``C`` + 10 hex characters of HMAC-SHA256."""

    def __init__(self, key: bytes) -> None:
        if len(key) < KEY_BYTES:
            raise ValueError(f"anonymisation key must have at least {KEY_BYTES} bytes")
        self._key = key
        self._seen: dict[str, str] = {}

    def code(self, name: str | None) -> str | None:
        if name is None:
            return None
        if name not in self._seen:
            digest = hmac.new(self._key, name.encode("utf-8"), hashlib.sha256).hexdigest()
            self._seen[name] = "C" + digest[:CODE_HEX_CHARS]
        return self._seen[name]

    def mapping(self) -> pd.DataFrame:
        """Name-to-code table of every name coded so far (private)."""
        rows = sorted(self._seen.items())
        return pd.DataFrame(rows, columns=["customer_name", "customer_code"])


def load_or_create_key(path: Path) -> bytes:
    """Read the key at ``path``, creating a random owner-only key file if it is missing."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(secrets.token_bytes(KEY_BYTES))
        path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return path.read_bytes()
