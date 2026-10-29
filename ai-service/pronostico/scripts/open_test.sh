#!/usr/bin/env bash
# F9: open the sealed final test once, after the freeze (`FREEZE.json`, tag v1.0.0-research-freeze).
# Requires a clean working tree; the opening is recorded in data/04_manifests/TEST_OPENED.json.
set -euo pipefail
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR  the working tree is not clean; commit first" >&2
  exit 1
fi
commit="$(git rev-parse HEAD)"
uv run pcs run-final-test --commit "$commit"
uv run pcs article-tables --stage test
echo "OK  final test opened at commit $commit"
