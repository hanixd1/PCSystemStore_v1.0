# Clarifications from the person responsible for the record

Reconciliation of doubts with the record's owner (plan 2.5.1, collection protocol step 4). Each
entry records the question, the answer as given, and how it was applied. Answers are from the
general manager of PCSystemStore, who keeps the vecinos record.

## 2026-10-21 - OBS codes, copied sheets and volume (after the F1 audit)

### OBS (observation) codes

| Code | Answer | Applied as |
|---|---|---|
| empty | The product was taken to sell, was not sold, and nobody wrote "returned" | `not_sold` - not demand |
| `DEV` | Returned | `return` |
| `GAR`, `GARANTIA`, `REEMP GARANTIA` | Warranty | `warranty` |
| `T` | Ticket; these were paid | `sale_paid` |
| `DAÑADA` | The product was damaged | `damaged` - not demand |
| `CONTR` | Not certain; probably an old return code | `return` (owner's best guess; 1 line) |
| `PAGO`, `PG`, `P`, `PAGP` | Not contested; `T` "was paid too" confirms `PAGO` as paid | `sale_paid` |
| `DEBE` | Credit sale that was paid later (second round) | `sale_credit` |

### Copied sheets "(n)" with different sales

Answer: take each copy as the following day, or otherwise add it to the same day.

Applied as rule R108: copy *n* is dated *n − 1* days after its name date; if that day already has
its own sheet, the copy is dated on its name date (same day as the original). Confidence `medium`.

### Drop in vecinos volume since mid-2025

Answer: because of the shortage of computer components, the company started selling more to final
customers and less to neighbouring shops. Supply (production) has fallen and there is little stock;
what there is goes to retail sales to the public. Neighbouring shops also sell less and order
less; when they order, it is mostly RAM, storage and motherboards.

Consequences recorded in the project plan (risk R1):

- The drop is **real**, not under-recording: the vecinos series has a structural break caused by
  supply and channel allocation, which is the channel-composition change that OE3 studies.
- Observed vecinos sales after the break are **supply-constrained** (censored demand): low sales
  partly reflect stock allocation, not only lower demand.
- The retail / invoiced channel is where most sales now are; its records are needed for the study.

## 2026-10-21 (second round) - remaining F1 items and the invoiced channel

| Question | Answer | Applied as |
|---|---|---|
| `DEBE` | A credit sale that was eventually paid | `sale_credit`, confirmed (counts as a sale) |
| Date written in OBS (sheet `25-04-24`, 6 lines) | An order placed with a neighbour; the date was its payment date. Not a sale | Excluded by new rule R209 |
| Dates in column J of sheet `13-04-26 (3)` | Columns G to K of the sheets are the shop's purchases. Do not use them | Rule R109 withdrawn; columns G onwards are no longer read |
| Multi-day sheets | With few sales, a new sheet was often not created and later days were written further down the same sheet | Noted; consistent with the multi-day ranges and copies already handled |

### Invoiced / retail channel and the tax ID (RUC)

- The company operated under a previous RUC until December 2025. That RUC had to be deregistered;
  its invoices are hard to access.
- From January 2026 the company invoices under a new RUC; those receipts are available as PDF.

Consequence (risk R1): retail sales are available only from January 2026 (about 9 months up to
the end of the study period), unless the previous RUC's electronic receipts can be recovered.

## 2026-10-23 - receipts of both RUCs delivered

The owner recovered and delivered the retail receipts of **both** RUCs as PDF: 1,116 facturas and
boletas from 2024-01 to 2026-09, filed by year, month and kind
(`datos/Boletas y Facturas/`). This replaces the expectation of retail data only from 2026-01.
Ingested and audited in phase F1b (`docs/phases/f1b_retail_receipts.md`).

Open questions after the F1b audit (pending answers):

| Question | Why it matters |
|---|---|
| About one in three receipt numbers of each series is not among the delivered files, in every month. Annulled, issued for another purpose, or not downloaded? Can missing ones be recovered from SUNAT? | Completeness of the retail demand (R307). **Answered (second round below):** receipts lost; the sales are in the vecinos record |
| Does a neighbour ever ask for a factura/boleta for a sale also written in the vecinos record? | Double counting when channels are combined |
| Were receipts cancelled or partly returned with notas de crédito? | Returns in the retail channel |

## 2026-10-23 (second round) - answers after the F1b audit, and the price list

| Topic | Answer as given | Applied as |
|---|---|---|
| Sales in the vecinos record vs receipts | The vecinos record probably holds more sales than the receipts, because many were sold with a nota de crédito | Recorded. The vecinos record stays the source for the vecinos channel; how the channels combine is settled in the plan v3 amendment. **Confirmed the same day:** the sales were made, but their electronic receipts were lost; those sales are to be counted through the vecinos record (the Excel). So the receipt numbers missing from the delivered files (R307) are largely sales recorded in the vecinos record: the Excel is the source for them, and a delivered receipt whose sale is also in the Excel must not be counted twice when the channels are combined (plan v3) |
| Prices | Prices have changed over time. A current price list for neighbours exists; final customers are charged somewhat more | Price list delivered: `datos/LISTA DISTRIBUCION PCSYSTEM-17-10-26.xlsx` (dated 2026-10-17) |

### Price list (`LISTA DISTRIBUCION PCSYSTEM-17-10-26.xlsx`)

Seven sheets by product family (processors/motherboards/GPUs, SSD/RAM, power supplies/cases/
coolers, mice, keyboards, adapters), each with blocks headed by a family name and the columns
`PART NUMBER`, `DESCRIPCIÓN`, `PRECIO`; about 500 products. No personal data.

Intended use (not ingested yet):

- **Catalog (F2):** part numbers and normalised descriptions to anchor the SKU catalog.
- **Inventory (F6):** unit values for products whose sales lines carry no amount (lost-sales
  value). It is a current neighbour price list, so it is a price reference at 2026-10, not the
  historical price; final-customer prices are somewhat higher.

Pending review by the owner (phase F2b): `data/03_series/price_links/review_merges.md` lists 117
products of the price list with the different texts (SKUs) linked to each; confirmed groups become
catalog merges. `review.md` lists weak links to confirm.

## 2026-10-23 (third round) - answers for the protocol amendment (plan v3)

Asked with development-span facts only (coverage counts, development volumes); no final-test
result exists.

| Question | Answer as given | Applied as |
|---|---|---|
| 17 of the 26 weeks from March to August 2026 have no vecinos sheet (2 of 112 weeks before). What happened in those weeks? | There were no sales to neighbours | A week (or month) without any vecinos sheet is a confirmed zero for the vecinos channel, as required by plan v2 section 2.6.2 ("not replaced by zero without reconciliation") |
| No factura of November 2024 was delivered | The owner can obtain them | To be delivered and ingested before the freeze (F8); until then November 2024 is flagged as incomplete for the facturado channel |
| Month the component shortage began | May 2025 (consistent with the vecinos share falling from about 0.6 to 0.3-0.5) | Structural break date for HE3: 2025-05-01 |
| Main demand series | Total demand plus each channel | Amendment v3, decision D1 |
