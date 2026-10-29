# F8 - Validity, reliability and freeze preparation

- Date: 2026-10-24, revised 2026-10-26 (protocol amendment v4)
- Plan phase: 3 (freeze before the final test), sections 2.5.2 A-B (validity and reliability of
  the instruments) and 2.6 (the freeze); quality plan (ISO/IEC 25040, 42001, 23894).
- Inputs consumed: the F8a configuration (`models.yaml`, `tuning.yaml`, `tuned.yaml`) and runs;
  `data/` manifests.
- Status: **frozen** on 2026-10-26 (`FREEZE.json`, tag `v1.0.0-research-freeze`). The owner
  reviewed the privacy matches the same day (`docs/quality/privacy.md`).

## Goal

Leave everything the freeze needs in place, verified by the system itself:
- model documentation;
- algorithmic evidence of validity and reliability;
- the product evaluation;
- the freeze record.

## Amendment v4: validity without expert judgement

The instruments are transactional records and the outputs of a deterministic computational
experiment, not psychometric instruments or surveys. Expert content validation (Aiken's V) is
unusual for this kind of article and was removed from the plan
(`docs/process/protocol_amendment_v4.md`, `Plan tesis v4.docx`).

Validity and reliability are established algorithmically, and every element is enforced by the
system:

| Element (plan 2.5.2) | How the system enforces it | Evidence |
|---|---|---|
| Schema validation | Every table is validated against a declared schema (pandera) before it is written. Rows that fail are excluded by numbered deterministic rules, with the rule and the reason logged. | F1/F1b audit reports; article Table A1 |
| Accounting reconciliation | Every fiscal receipt reproduces its printed total: 1,151 of 1,151, largest gap S/ 0.005. Vecinos daily blocks are checked against the TOTAL row: 564 of 567 match, and every exception is reported. | `pcs freeze --check` (`reconciliation`); article Tables A1-A2 |
| Temporal leakage control | The training view is read-only and cut at the origin. The test panel is stored apart and opened only against a frozen record whose configuration hashes match. Property-based tests check both. | `protocol/origins.py`; `tests/property/`; article Table B1 |
| Reproducibility by SHA-256 | Every source, intermediate file, configuration and pretrained weight file is hashed. A rerun reproduces every forecast bit for bit. | `FREEZE.json`; `evidence/f8/reproducibility.md`; article Tables C1-C3 |

## Delivered

| Item | Location |
|---|---|
| Model cards (9): method, basis and verification, pinned weights (Table 20 note), effective parameters per frequency, development-span results, intended use, limitations | `docs/model_cards/` |
| `pcs freeze --check` checks:<br>• configs frozen;<br>• every `data/` step manifest intact (sealed test panel included);<br>• pinned weights cached;<br>• accounting reconciliation (100 % of fiscal receipts);<br>• no record used the test;<br>• the commit checked out. | `freeze/run.py` |
| `pcs freeze` / `scripts/freeze.sh` write `FREEZE.json` with:<br>• the SHA-256 of configs, lockfile, data manifests, sealed panel and weight files;<br>• the reconciliation figures, commit, tag, final-test window, latest runs and environment.<br>It also writes a committed copy in `docs/freeze/` and the git tag. | `freeze/run.py`, `scripts/freeze.sh` |
| The test seal also requires the configuration hashes recorded at the freeze | `protocol/origins.py` |
| `pcs compare-runs`: per-model differences between two runs (reliability, compatibility) | `evaluation/compare.py` |
| `pcs article-tables`: data governance, temporal split, reproducibility and statistical tables, built from the recorded artifacts | `reporting/article.py`, `docs/article/evidence_tables.md` |
| Run records add:<br>• pinned pretrained versions;<br>• explicit seeds;<br>• times by stage;<br>• peak and total memory. | `runner/run.py`, `inventory/run.py`, `runtime.py` |
| ISO/IEC 25040 evaluation, AI risk register (23894), ISO/IEC 42001 statement of applicability | `docs/quality/` |

## Results

- **Reconciliation:**
  - vecinos: 564 of 567 daily blocks match (1 mismatch, 1 without a TOTAL row, 1 with a
    non-numeric total);
  - receipts: 1,151 of 1,151.
- **Repeatability:** all 7 series outputs identical after a rebuild.
- **Reproducibility:** every forecast of the 9 models identical on a second run (weekly
  9 × 202,176, monthly 1-month 9 × 13,824).
- **`pcs freeze --check`** (`evidence/f8/freeze_check.txt`):
  - passed: data manifests, pinned weights, reconciliation, test unused;
  - pending: configs still `draft`.

## Verification

| Check | Result |
|---|---|
| Tests on the host | 307 pass, coverage 98 % |
| Tests in Docker | 306 pass, 1 skipped (real Chronos fine-tuning; no PyTorch in the container) |
| SonarQube | gate passed: 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, coverage 98.2 % (`evidence/f8/sonar_f8.txt`) |
| `test_span_used` | `false` in every record |

## Update 2026-10-25: external code review

An external specialist reviewed the code against the plan
(`docs/quality/reviews/2026-10-25-expert-code-review.md`). Six refinements were verified and
applied:

- the expanding-window contrast;
- the mean-training-price valuation;
- run times by stage;
- months with sales and customer/SKU concentration in the profile;
- property-based tests;
- the 3-month monthly sensitivity horizon (found during the check).

Main-horizon forecasts are unchanged.

## Next steps (in order)

1. Done 2026-10-26: the owner reviewed the privacy matches (4 allow-listed, 7 accepted).
2. Done 2026-10-26: set `status: frozen` in every config, commit, and run `scripts/freeze.sh`.
   This writes `FREEZE.json` and the tag `v1.0.0-research-freeze`.
3. Done 2026-10-26: F9 opened the final test once (`f9_final_test.md`).

## Decisions and deviations

- The expert form, its examples and `pcs aiken` (2026-10-24) were removed with amendment v4.
  They remain in the Git history (commits `2cfb7f9`, `2ae88e8`).
- Git is driven by a shell script, not by the Python package, so that the package runs no OS
  commands.
