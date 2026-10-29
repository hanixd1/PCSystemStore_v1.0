#!/usr/bin/env bash
# F8 freeze: run only after the owner's approval and a passing `pcs freeze --check`.
# Requires every config with `status: frozen`, committed, and a clean working tree.
set -euo pipefail
tag="${1:-v1.0.0-research-freeze}"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR  the working tree is not clean; commit first" >&2
  exit 1
fi
commit="$(git rev-parse HEAD)"
uv run pcs freeze --commit "$commit" --tag "$tag"
git add docs/freeze/FREEZE.json
git commit -m "Freeze the research configuration ($tag)"
git tag -a "$tag" -m "Research freeze of commit $commit"
echo "OK  frozen $commit, tagged $tag"
