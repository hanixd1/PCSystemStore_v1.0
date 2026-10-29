# F0 — Foundation

- Date: 2026-10-21
- Plan phase: none (enabling increment)
- Inputs consumed: none (first phase). The raw Excel in `datos/` was only profiled for structure
  during planning; it is not read by any F0 code.

## Goal

Create a reproducible, quality-gated base on which every later phase is built, without any domain
logic yet.

## Delivered

| Item | Location |
|---|---|
| uv project, Python 3.12, locked dependencies with optional extras (`models`, `foundation`, `stats`, `app`) | `pyproject.toml`, `uv.lock` |
| Draft experiment configuration from plan Tables 17, 20, 21 and the first raw source | `configs/*.yaml` |
| Strict, immutable pydantic models for every config file (unknown keys rejected; frozen pretrained models must pin `hf_repo` + `hf_revision`) | `src/pcsforecast/config.py` |
| Project layout resolver (`PCS_PROJECT_ROOT`) | `src/pcsforecast/paths.py` |
| Environment fingerprint for the experiment log | `src/pcsforecast/runtime.py` |
| CLI: `pcs version`, `pcs env`, `pcs check-config` | `src/pcsforecast/cli.py` |
| Tests: 27 (unit + integration), 100 % line and branch coverage | `tests/` |
| ruff, strict mypy, pre-commit (incl. a hook that blocks `.xlsx/.csv/.parquet`) | `pyproject.toml`, `.pre-commit-config.yaml` |
| Linux image from the lockfile, non-root user, CPU PyTorch index on Linux | `Dockerfile` |
| Local SonarQube 26.9 Community Build + scanner target | `docker-compose.sonar.yml`, `sonar-project.properties`, `Makefile` |
| ADRs: methodology, stack, quality framework | `docs/adr/` |
| Project plan (ISO/IEC 29110) and quality plan (25010/25012/25059/25040, ISO matrix, test plan) | `docs/process/`, `docs/quality/` |

## Verification

| Check | Result | Evidence |
|---|---|---|
| `make check` on host (ruff, ruff format, mypy strict, pytest) | pass, 27 tests, coverage 100 % | `evidence/f0/tests_host.txt` |
| Tests in Docker (`linux/aarch64`) | pass, 27 tests | `evidence/f0/tests_container.txt` |
| `pcs check-config` | 4 × OK, status `draft` | `evidence/f0/config_hashes.txt` |
| Environment fingerprints | host and container recorded | `evidence/f0/environment_*.json` |
| Lockfile hash | recorded | `evidence/f0/lock_hashes.txt` |
| SonarQube analysis (commit 2b4eec9) | gate passed; 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, 0 % duplication, 100 % coverage, ratings A/A/A | `evidence/f0/sonar_f0.txt` |
| Project quality gate `pcsforecast-gate` (quality plan §3) | pending: the Global Analysis token cannot administer gates; run `make sonar-gate` once with a User token in `SONAR_ADMIN_TOKEN` | `scripts/sonar_quality_gate.sh` |

## Deviations

- Planned subpackages (`schemas`, `ingest`, …) are **not** created as empty folders; each is created
  in the phase that implements it (see project plan, section 2).
- No CI service: there is no remote repository. `make check`, `make test-docker` and `make sonar`
  are the CI equivalent and are part of the Definition of Done.
- The first commit accidentally contained the SonarQube token (pasted into `.env.example` before
  the commit). The repository has no remote, so it never left the machine; the commit was amended,
  the reflog expired and unreachable objects pruned. The token now lives only in the ignored `.env`.
- The SonarScanner image is published for `linux/amd64` only and runs under emulation on Apple
  silicon (`--platform linux/amd64`).

## Handoff to F1

F1 starts from: config hashes in `evidence/f0/config_hashes.txt`, lockfile hash in
`evidence/f0/lock_hashes.txt`. F1 will copy the delivered Excel from `datos/` to `data/00_raw/`
(read-only, SHA-256 manifest), add the `schemas`, `ingest` and `audit` subpackages and the first
cleaning rules in `configs/data_rules.yaml`. Open question carried over: the drop in recorded
volume (project plan, risk R1).
