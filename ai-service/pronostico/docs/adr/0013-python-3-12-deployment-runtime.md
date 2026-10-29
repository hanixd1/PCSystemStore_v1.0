# ADR-0013: Python 3.12 runtime for the web deployment

- Status: accepted
- Date: 2026-10-28
- Supersedes: [ADR-0006](0006-python-3-14-runtime.md) for the package metadata and the container

## Context

The production layer (F11) is installed by the PCSystemStore ai-service, which is built by GitHub
Actions and Railway. `requires-python = "==3.14.*"` made `pip install -r requirements.txt` fail on
the CI runner (Python 3.11), and the 3.14.9 image and builders are not available everywhere the
web store is built.

## Decision

- `requires-python = ">=3.12"`, `.python-version` = `3.12`; ruff `py312`, mypy `3.12`,
  `sonar.python.version=3.12`.
- Container base image back to `python:3.12.15-slim-bookworm`.
- ai-service: `runtime.txt` = `python-3.12`, GitHub Actions and SonarCloud on 3.12.
- `uv.lock` re-resolved for `>=3.12`; no package version changed.

## Consequences

- The frozen research results stay valid: they were produced on Python 3.14.9 (`FREEZE.json`) and
  were verified identical to Python 3.12 on the real record
  (`docs/phases/evidence/python314/equivalence.md`).
- The runtime tests only check that a Python 3 fingerprint is recorded, not a fixed minor version.
