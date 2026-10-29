# ADR-0006: Python 3.14 runtime

- Status: accepted
- Date: 2026-10-23
- Supersedes: the Python 3.12 line of [ADR-0002](0002-technology-stack.md)

## Context

Python 3.12 receives security fixes only until October 2028. Python 3.14 is in bugfix support and
receives security fixes until October 2030, which covers the thesis and the post-thesis production
phase. The owner asked to move the project to Python 3.14.9.

## Decision

- `requires-python = "==3.14.*"`, `.python-version` = `3.14.9`; ruff `py314`, mypy `3.14`,
  `sonar.python.version=3.14`.
- Container base image `python:3.14.9-slim-trixie` (Debian 13, the current Debian stable),
  replacing `python:3.12.15-slim-bookworm`.
- `uv.lock` re-resolved for 3.14; no package version changed.

## Consequences

- Every core and `app`/`stats`/`foundation` dependency ships Python 3.14 wheels.
- `statsforecast` (optional `reference` extra) stays at 2.0.1, which has no 3.14 wheel and is built
  from source; 2.1.1 has 3.14 wheels but requires `pandas<3`. The extra is not used by the
  pipeline and is not installed in the container. Revisit when statsforecast supports pandas 3.
- Outputs were verified identical to Python 3.12 on the real record
  (`docs/phases/evidence/python314/equivalence.md`).
- Update 2026-10-24: the `reference` extra was removed; the statsforecast cross-check runs in an
  isolated environment with statsforecast 2.1.1 and `pandas<3` (ADR-0004 update).
