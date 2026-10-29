# ADR-0007: Reading receipt PDFs by word position

- Status: accepted
- Date: 2026-10-23

## Context

The retail channel arrives as 1,116 PDF receipts printed by SUNAT's issuing system: text PDFs,
one per receipt, in two layouts (former and current RUC). Plain text extraction (pypdf) loses the
table structure: wrapped descriptions are printed below their item and amounts drift to other
lines, and several fields printed side by side merge into one line. The data contain personal
data, so no external OCR or document service can be used.

## Decision

- Use **pdfplumber** (pure Python on pdfminer.six) to read words with their coordinates.
- Header and totals: words grouped into visual rows, rows split into segments at horizontal gaps
  wider than 10 points, except around a label's colon; fields recognised by their printed labels.
- Item table: columns taken from the heading row (`Cantidad`, `Unidad`, `Valor`); an item starts
  at a row whose first word is a quantity left of the unit column; following rows extend its
  description; amounts are the words right of the first value heading. The table continues on the
  next page until a footer label is found.
- Correctness is proven on every receipt by reconciliation with its printed totals (rule R304),
  not by sampling.
- The address is never read; name and document number never leave memory except into
  `data/private/`.

## Consequences

- 1,116 / 1,116 delivered receipts read and reconciled; a layout change would show up as
  reading issues or reconciliation failures, never as silently wrong data.
- Tests use synthetic PDFs written by a minimal PDF writer (`tests/conftest.py`) with fictitious
  customers, reproducing both layouts' quirks.
- Scanned (image) receipts are not supported; none were delivered.
