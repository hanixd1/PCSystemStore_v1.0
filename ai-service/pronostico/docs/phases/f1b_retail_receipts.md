# F1b - Ingest and audit of the retail receipts (facturas and boletas)

- Date: 2026-10-23
- Plan phase: 1 (audit and preparation of the records, section 2.6.1), second source
- Inputs consumed: 1,116 PDF receipts delivered by the owner in
  `datos/Boletas y Facturas/<year>/<month>/<kind>/` (registered read-only with SHA-256 in
  `data/00_raw/retail_receipts/`, manifest in `evidence/f1b/manifest_01_staged_retail.json`).

## Goal

Add the retail (invoiced) channel to the study with the same guarantees as the vecinos record:
raw files never edited, every decision a declared rule, every item traceable to its file, and
customers pseudonymised. Receipts carry more personal data than the vecinos record (name, DNI or
RUC, address), so protecting it was a design requirement, not an afterthought.

## Delivered

| Item | Location |
|---|---|
| `pcs register-raw` keeps the delivery's sub-folders (year/month/kind) in the raw copies | `ingest/raw_registry.py` |
| Receipt reader: words read with their page position; the item table is split into columns by its headings, so wrapped descriptions and items continued on a second page stay with their item; rows are split into segments at wide gaps so fields printed side by side are read apart | `ingest/receipts.py` (ADR-0007) |
| `pcs stage-receipts`: one row per receipt (header, totals, reading problems) and one per item; customers leave the PDF as codes only | `data/01_staged/retail/` |
| `pcs audit-receipts`: rules R301-R307, reconciliation, numbering completeness, clean item lines, audit report | `audit/receipts.py`, `data/02_clean/retail/` |
| pandera contracts `StagedReceipt`, `StagedReceiptLine`, `CleanRetailLine` | `schemas/receipts.py` |
| Private customer table (code, DNI/RUC, name; mode 600) and leak scan extended to DNI/RUC numbers and to bare document numbers in any customer column | `privacy.py`, `pcs check-privacy` |
| Dashboard tab "Canal facturado": receipts and units by month, coverage by numbering, audit (aggregates only) | `app/dashboard.py` |
| Synthetic receipt PDFs for tests (fictitious customers), built by a minimal PDF writer | `tests/conftest.py` |

## Personal data: what is read, what is kept

| Field on the receipt | Read | Kept | Where |
|---|---|---|---|
| Address | **no** (the reader skips it) | no | - |
| Name | yes, in memory | only in `data/private/retail_customers.parquet` | private (600) |
| DNI / RUC | yes, in memory | only in `data/private/retail_customers.parquet`; everywhere else as the keyed-hash code | private (600) |
| Observation text | yes, in memory | only a yes/no flag | staged table |
| Customer kind | derived | `person` (DNI, RUC 10/15/17) or `company` (RUC 20) | staged and clean tables |

The customer code is the HMAC-SHA256 of the document number with the project's private key
(rule R306), so a customer keeps one code across name spellings. Four boletas show no document;
they are coded by name.

## Results on the delivered receipts

Full report: `evidence/f1b/audit_report.md`; by month: `evidence/f1b/coverage_by_month.md`.

| Aspect (ISO/IEC 25012) | Result |
|---|---|
| Completeness | 1,116 files → **1,116 valid receipts** (580 facturas, 536 boletas), **3,498 item lines, 4,771 units**; issue dates 2024-01-03 → 2026-09-30; every month from 2024-01 to 2026-09 has receipts |
| Consistency | **1,116 / 1,116 receipts reconcile** with their printed totals (facturas: Σ quantity × unit value = sale value; boletas: Σ sale amounts = total); largest difference S/ 0.005 |
| Completeness of the channel (R307) | Series numbering shows **gaps**: 816 numbers missing between delivered receipts (former RUC: 297 facturas, 358 boletas; current RUC: 55 facturas, 106 boletas). Within-month delivered share 52 %-86 %, 64 % overall. Not imputed; question to the owner below |
| Accuracy | Single currency (SOLES), unit always UNIDAD, no free (gratuita) operations, no discounts |
| Traceability | Every item keeps its raw file; 26 receipts filed in the folder of another month (R301; the whole 2024/Noviembre/Factura folder holds October facturas, so no factura of November 2024 was delivered) and 25 facturas filed in a "Boleta" folder (R302) are logged with original and corrected values |
| Confidentiality | 702 customer codes (698 by document number, 4 by name); 0 addresses read; `pcs check-privacy` finds no retail customer name or DNI/RUC outside `data/private/` |

Two issuers appear, as expected: the former RUC (2024-01 to 2025-12) and the current RUC
(2026-01 onwards); both are companies (RUC 20).

## Verification

| Check | Result | Evidence |
|---|---|---|
| `make check` (ruff, mypy strict, pytest) | pass, 237 tests, coverage 98.7 % | - |
| Tests in Docker (Python 3.14.9, Debian 13) | pass, 237 tests | `evidence/f1b/tests_container.txt` |
| Vecinos outputs after the change | all 19 tables (staged, clean, series, validation and inventory runs) identical to before | - |
| Leak scan on the real outputs | 0 retail names or DNI/RUC; the only matches are the four one-word vecinos nicknames already pending the owner's review (they coincide with words of product descriptions) | `pcs check-privacy` |
| SonarQube | gate passed after fixing 10 code smells; 0 bugs, 0 vulnerabilities, 0 code smells, 0 hotspots, coverage 98.7 %, duplication 0.0 % | `evidence/f1b/sonar_f1b.txt` |
| Refactor safety | staged and clean receipt tables and the audit report identical before and after the SonarQube fixes | - |

## Decisions and deviations

- The receipts' series and numbers are the receipts' identity (R303); the file name is not used.
- Item amounts are kept as printed (unit value without tax; boletas also their sale amount with
  tax). `net_amount` = quantity × unit value, comparable across facturas and boletas.
- The September 2026 receipts are after the study's record end; they are kept in the clean table
  and left out by the study windows when the series are built.
- The retail lines are **not yet merged into the demand series**: how the two channels enter the
  series (separately, summed, or retail only for the test span) changes the protocol and is part
  of the plan v3 amendment, decided before any result is seen.

## Questions for the owner

1. **Missing numbers.** About one in three receipt numbers of each series is not among the
   delivered files, spread over every month. Were they annulled, issued to other channels
   (e.g. neighbours), or not downloaded? If not downloaded, can they be recovered from SUNAT?
2. **Neighbours with receipts.** Does a neighbour ever ask for a factura or boleta for a sale also
   written in the vecinos record? If so, the same sale would be counted twice when the channels
   are combined.
3. **Credit notes.** Were any receipts later cancelled or partly returned with a nota de crédito?
   None were delivered.
