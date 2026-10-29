#!/usr/bin/env bash
# Cross-check of the own statistical models against statsforecast (ADR-0004).
# Usage: scripts/cross_check_statsforecast.sh weekly|monthly
set -euo pipefail
frequency="${1:-weekly}"
out="$(uv run pcs reference-cases --frequency "$frequency" | sed -n 's/^OK  //p')"
uv run --isolated --no-project --python 3.14.9 \
    --with "statsforecast==2.1.1" --with "pandas<3" \
    python -I scripts/reference/statsforecast_reference.py "$out"
uv run pcs compare-reference "$out"
