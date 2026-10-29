# F1 - Ingest and audit of the vecinos record

- Date: 2026-10-21
- Plan phase: 1 (audit and preparation of the record, section 2.6.1)
- Inputs consumed: F0 configuration and lockfile (`evidence/f0/config_hashes.txt`,
  `evidence/f0/lock_hashes.txt`); the delivered workbook
  `datos/VENTAS_INTERNAS_2024_ACTUAL_11-07-26.xlsx`
  (sha256 `6e5ec18e84e13c3243429f5e163b30002b712b804af88b8e30d2f1a9ae19351e`).

## Goal

Turn the delivered workbook into an audited, traceable line table without editing the raw file:
every exclusion and correction is a declared rule, every line keeps its sheet and row of origin, and
customers are pseudonymised.

## Delivered

| Item | Location |
|---|---|
| `pcs register-raw`: read-only copy in `data/00_raw/<source>/` + SHA-256 manifest; a changed delivery under an existing name is refused | `ingest/raw_registry.py` |
| `pcs stage`: transactional extraction sheet (Annex 03) - every non-empty row of columns A-F as raw text, with sheet, block and Excel row; sales blocks (header → TOTAL); columns G onwards (purchases, expenses) are not read | `ingest/vecinos_workbook.py` |
| `pcs audit`: sheet-date resolution, line classification, corrections log, pseudonymisation, reconciliation and the quality audit sheet | `audit/` |
| pandera contracts for the Table 19 instruments produced so far | `schemas/extraction.py` |
| Step manifests: each step verifies its inputs' hashes against the previous manifest | `manifest.py` |
| Cleaning rules R101-R111 (dates; R109 withdrawn) and R201-R209 (lines), OBS movement types | `configs/data_rules.yaml` |
| Place for company-confirmed sheet dates (rule R110), empty | `configs/sheet_date_overrides.yaml` |
| Data dictionary | `docs/data_dictionary.md` |

## Results on the real record

Full report: `evidence/f1/audit_report.md` (counts only; no customer names).

| Aspect (ISO/IEC 25012) | Result |
|---|---|
| Completeness | 569 sheets (5 hidden); 6,003 staged rows → **5,087 valid lines, 5,576 units**; 916 excluded: 887 template rows (R201), 16 amount without product (R202), 7 outside a block (R203), 6 orders placed with a neighbour (R209) |
| Accuracy | 27 missing quantities set to 1 (R204), 1 non-numeric amount (R205); 283 valid lines without amount (mostly returns); 12 non-positive amounts |
| Consistency | 567 blocks: **564 match their TOTAL row**, 1 mismatch (`22-03-25`: lines 7,540 vs TOTAL 7,380), 1 without TOTAL row (`19-02-24`), 1 TOTAL not numeric (`08-03-25`); 27 possible duplicate lines and 41 serials in more than one sale (flagged, not removed) |
| Credibility | Valid lines by movement: sale_paid 4,760 (5,214 units), return 290, not_sold 29, warranty 6, sale_credit 1, damaged 1; **every movement type confirmed by the company**, no unmapped codes |
| Currentness | Sheet dates: 523 high (anchors), 42 medium (incl. the 15 copies dated by R108), 4 none (empty sheets). Valid lines: 4,701 high, 386 medium. Coverage 2024-01-03 → 2026-09-14; **no lines in 2026-06**; monthly lines fall from ~250 (2024) to ~40 (2026) - a real drop explained by the company |
| Traceability | Every line keeps sheet index, sheet name and Excel row; corrections keep the original value |
| Confidentiality | 270 customer codes (keyed HMAC); names only in `data/private/` |
| Catalog preview | 1,213 distinct normalised product texts (input to F2) |

## Verification

| Check | Result | Evidence |
|---|---|---|
| `make check` (ruff, mypy strict, pytest) | pass, 120 tests (unit, property, integration), coverage 99 % lines / 97 % branches | `evidence/f1/tests_host.txt` |
| Tests in Docker | pass, 120 tests | `evidence/f1/tests_container.txt` |
| Real pipeline host vs container (re-run after the clarifications) | all tables and the audit report identical | `evidence/f1/host_container_equivalence.txt` |
| SonarQube | gate passed after fixing 3 findings over the phase (duplicated literal, cognitive complexity 21 > 15, regular-expression complexity 30 > 20); 0 bugs, 0 vulnerabilities, 0 code smells, 0 % duplication | `evidence/f1/sonar_f1.txt` |
| Refactor safety | stage and audit outputs byte-identical before and after the SonarQube fixes | - |
| Step manifests | raw, staged and clean hashes recorded | `evidence/f1/manifest_*.json` |

## Decisions and deviations

- Excluded rows stay in the clean table with `status = excluded` and the rule id, so every
  denominator in the audit can be recomputed.
- Text normalisation (R206) is not written to the correction log row by row: the raw and
  normalised values are kept side by side in the clean table instead.
- Copy sheets "(n)" differ in content from their originals. After the company's answer they are
  dated n-1 days after their name, or on the same day when that day already has a sheet (R108,
  medium confidence).
- The Docker image now keeps uv's download cache between builds and waits up to 180 s per
  download: a rebuild failed on a PyPI network timeout.
- Duplicate lines and repeated serials are flagged only, as the plan requires (no automatic removal).

## Company clarifications (2026-10-21)

The record's owner answered the open items of the first audit
([company_clarifications.md](../process/company_clarifications.md)). Applied in this phase:

- OBS meanings: empty = taken to sell but not sold (`not_sold`), `T` = ticket, paid (`sale_paid`),
  `DAÑADA` = damaged (`damaged`), `CONTR` = probably an old return (`return`), `DEV` = return,
  `GAR`/`GARANTIA` = warranty. New movement types `not_sold` and `damaged`; empty OBS is configured
  by `empty_code_type`.
- Copy sheets: rule R108 changed from "name date, low confidence" to "following day(s), or the same
  day if taken".
- Volume drop: real, caused by the component shortage; sales were reallocated to final customers
  and vecinos order less (mostly RAM, storage, motherboards). Recorded as the cause of risk R1.

Outputs and evidence were regenerated with these rules (same staged data; 5,093 valid lines).

## Second round of clarifications (2026-10-21)

- `DEBE` is a credit sale that was paid: confirmed as a sale.
- The 6 lines with a date in OBS (sheet `25-04-24`) are an order placed with a neighbour: excluded
  by the new rule R209.
- Columns G-K of the sheets are the shop's purchases: rule R109 (row dates from column G onwards)
  was withdrawn and those columns are no longer read.
- Invoiced channel: the previous RUC operated until December 2025 and its receipts are hard to
  access; the new RUC's receipts (from January 2026) are available as PDF.

## Remaining open items

1. The TOTAL mismatch on `22-03-25` (difference 160).
2. **Invoiced / retail channel records** (risk R1): PDF receipts from January 2026; the previous
   RUC's receipts (2024-2025) still to be located.

## Handoff to F2

F2 consumes `data/02_clean/` as recorded in `evidence/f1/manifest_02_clean.json` (valid lines,
sheet dates, corrections). F2 must filter `status == "valid"`, build gross demand from `sale_paid`
and `sale_credit` (returns, warranties, damaged and not-sold kept apart, as plan 2.6.1 requires), and
treat `date_confidence` explicitly. The channel shift (R1) must be handled in the protocol before any
test result is seen.
