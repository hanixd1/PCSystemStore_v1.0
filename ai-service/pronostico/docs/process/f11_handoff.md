# F11 handoff - connect the forecasting system to the company's local web page

- Date: 2026-10-28
- From: the thesis sessions (F1-F10 done; last commit on `main`: `27dd68c`).
- Scope of F11 (project plan): recurring forecasts with frozen models, a prospective log, drift
  monitoring, and human-approved replenishment suggestions.

## What the next session does first

1. Read the company's local web page (folder given by the owner): its framework, design system,
   pages and how it runs locally.
2. Adapt the forecasting views to that design and connect them to this system, **locally only**.
3. Nothing goes to the cloud or to Git until the owner has reviewed it and it works. The web page
   already has hosting; publishing is decided later.

## Rules that carry over

- Research results stay frozen:
  - the primary results are `v1.0.0-research-freeze`;
  - the declared re-evaluation is `v1.1.0-amendment-v5`;
  - never reopen the test or change `configs/` on `main`.
- Daily forecasts use the corrected, up-to-date company data (owner-confirmed sheet dates), not the
  frozen research panels. Production work goes on its own branch.
- Privacy:
  - customer names, DNI and RUC never leave `data/private/`, and are never shown in a page or in chat;
  - the current research dashboard listens on `127.0.0.1` only;
  - company data files are never committed (a pre-commit hook blocks them).
- Code, configuration, commits and docs are in English; replies to the owner are in Spanish.
- Every change needs tests (host and Docker) and a SonarQube pass (gate: 0 issues).

## Where things are

| Item | Location |
|---|---|
| CLI and pipeline | `README.md` (commands `pcs ...`), `src/pcsforecast/` |
| Research dashboard (Streamlit, read-only) | `app/dashboard.py`, `make dashboard` |
| Results for the page | `docs/thesis/results_tables.md`, `docs/thesis/figures/`, `docs/article/evidence_tables_final_test.md` |
| Phase reports | `docs/phases/` (F9 final test, F10 results) |
| Amendment v5 clone (evidence only; not for the page) | `../sistema-pronostico-enmienda-v5` (branch `amendment/v5-corrected-dates` is already in this repo) |
