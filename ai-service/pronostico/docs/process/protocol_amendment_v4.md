# Protocol amendment v4 - algorithmic validity instead of expert judgement

- Date: 2026-10-26
- Decided by: the researcher (owner of PCSystemStore), before the freeze and before any
  final-test result.
- Plan document: `Documentacion/Plan tesis v4.docx`, tracked changes by "Enmienda v4" over
  `Plan tesis.docx`.

## Reason

The thesis is to be published as a scientific article (Q3/Q4 target). The instruments are
transactional records and the outputs of a deterministic computational experiment. They are not
psychometric instruments or surveys, so content validation by expert judgement (Aiken's V) does
not fit them, and journal reviewers would find it unusual. Reviewers of forecasting and
operations articles expect four things instead:

- data governance with auditable filtering;
- a strict temporal split with no leakage;
- computational reproducibility;
- non-parametric statistical comparison tied to an operational (inventory) evaluation.

## Changes to the plan

| Place in the plan | Before | After |
|---|---|---|
| Introduction (overview of the annexes) | "...y el formato de validación por juicio de expertos" | "...y el registro de experimentos" |
| 2.5.2 A. Validez | Five experts rate pertinence, clarity and sufficiency; Aiken's V >= 0.80 per item | Validity established by algorithmic validation, with four elements:<br>• fields derived from Hewamalage et al. (2023);<br>• schema validation with numbered deterministic exclusion rules;<br>• accounting reconciliation: 100 % of fiscal receipts reproduce their printed total, and every exception in the vecinos sheets is reported;<br>• temporal leakage control: a read-only view cut at the origin, and a sealed test opened only against a freeze whose SHA-256 hashes match. |
| 2.5.2 B. Confiabilidad | Reconciliation, repeatability, reproducibility | Same tests; every source, intermediate file, configuration and pretrained weight is hashed (SHA-256), and repeatability and reproducibility are verified by comparing hashes and predictions |
| Table 24 (schedule), activity 7 | "Validación de instrumentos por juicio de expertos" | "Validación algorítmica de los instrumentos (esquemas, conciliación y control de fuga)" |
| Table 25 (budget), item 4.2 | Expert validation, 5 × S/ 100 = S/ 500 | Removed; items 4.3-4.5 renumbered 4.2-4.4 |
| Budget totals (text, Tables 25-26) | Services S/ 3,150; contingency S/ 779; total S/ 16,359 | Services S/ 2,650; contingency S/ 754 (5 % of S/ 15,080); total S/ 15,834; shares recomputed |
| References | Aiken (1985) | Removed (no longer cited) |
| Annex 05, Table 31 | Expert validation form | Removed |

The automatic indexes (contents, tables) are fields. They update in Word, and the stale entries
"Anexo 05" and "Tabla 28 ... juicio de expertos" disappear then.

## What does not change

- Objectives, hypotheses, models, metrics, statistical tests and the inventory policy.
- The final-test window, which stays sealed.

No result is affected: the change concerns how the validity of the instruments is argued and
documented, not how anything is computed.

## Changes to the system

- Removed:
  - `pcs aiken` and `src/pcsforecast/validation/`;
  - the expert form and its ratings template (`docs/validation/`);
  - the form generator (`scripts/validation/`).

  They remain in the Git history (commits `2cfb7f9`, `2ae88e8`).
- `pcs freeze --check` replaces the expert-validation condition with the accounting
  reconciliation: every fiscal receipt must reconcile, and vecinos exceptions are reported.
  `FREEZE.json` records the figures.
- New `pcs article-tables`. It builds the four groups of evidence (governance, temporal split,
  reproducibility, statistics) from the recorded artifacts (`docs/article/evidence_tables.md`).
