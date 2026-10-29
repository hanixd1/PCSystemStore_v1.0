"""Text normalisation shared by extraction, cleaning and privacy checks (rule R206)."""

from __future__ import annotations

import math
import re

_SPACES = re.compile(r"\s+")


def normalize_text(value: object) -> str | None:
    """Trim, collapse spaces (incl. non-breaking), upper-case; ``None`` if empty (R206)."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    text = _SPACES.sub(" ", str(value).replace("\xa0", " ")).strip().upper()
    return text or None
