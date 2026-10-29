# Data dictionary

Tables produced by the pipeline. Contracts are enforced by the pandera schemas in
`src/pcsforecast/schemas/`; this page explains the fields. Rule ids refer to
`configs/data_rules.yaml`.

## data/00_raw

Read-only copies of delivered files, one folder per source, plus `manifest.json` (SHA-256 of the
delivered file and of the copy).

## data/01_staged - transactional extraction sheet (Table 19, Annex 03)

### vecinos_sheets.parquet

| Field | Meaning |
|---|---|
| source_sha256 | Hash of the raw workbook |
| sheet_index | Position of the worksheet in the workbook (0-based) |
| sheet_name | Worksheet name exactly as written |
| hidden | Worksheet hidden in Excel |
| n_rows | Rows in the worksheet's used range |
| n_headers | Header rows (`CANT`, `PRODUCTO`) found |

### vecinos_blocks.parquet

| Field | Meaning |
|---|---|
| sheet_index, block | Worksheet and block number (a block runs from a header to its TOTAL row) |
| header_row | Excel row of the header (empty for rows before any header) |
| total_row, total_raw | Excel row and raw value of the TOTAL row (empty if the block has none) |

### vecinos_lines.parquet

| Field | Meaning |
|---|---|
| line_id | `<first 12 hex of source hash>:<sheet_index>:<excel_row>`; stable identifier of a line |
| sheet_index, sheet_name, block, excel_row | Provenance |
| row_kind | `line` inside a block, `outside_block` between a TOTAL and the next header |
| cant_raw, producto_raw, monto_raw, serie_raw, obs_raw | Columns A, B, C, E and F (CANT, PRODUCTO, MONTO, SERIE, OBS) as raw text. Columns G onwards hold the shop's purchases and expenses and are not read |
| customer_code | Keyed-hash code of the buyer in column D (PASE); the name itself is never stored here (R208) |

## data/02_clean - audited lines (plan section 2.6.1)

### vecinos_sheet_dates.parquet

| Field | Meaning |
|---|---|
| name_date | Date read from the name (after year completion), if any |
| is_copy | Name has a copy suffix "(n)" |
| is_anchor | Belongs to the longest chronological run of clean names (R105) |
| date_start, date_end | Resolved date or interval |
| confidence | `confirmed` (override) · `high` (anchor) · `medium` (rule-repaired or range) · `low` (copy or interval) · `none` (undated, no lines) |
| rules | Rules applied, in order |

### vecinos_lines.parquet

| Field | Meaning |
|---|---|
| line_id, sheet_index, sheet_name, excel_row | Provenance |
| date_start, date_end, date_confidence | Date of the line, from its sheet |
| quantity | Units (positive integer); empty on excluded rows |
| quantity_imputed | Quantity set to 1 by R204 |
| amount | Line total in soles (MONTO is the line total, not the unit price); empty if missing |
| product_raw, product_text | Product as written and normalised (R206); SKU mapping comes in F2 |
| customer_code | Keyed-hash pseudonym of the buyer (R208) |
| movement_code, movement_type | Normalised OBS and its movement type (R207) |
| has_serial | A serial number was written |
| status, exclusion_rule | `valid` or `excluded` with the rule that excluded it |

### corrections.parquet - correction log

| Field | Meaning |
|---|---|
| line_id | Corrected line |
| field | `quantity` or `amount` |
| original, corrected | Value before and after |
| rule_id | Rule that made the change |

### reconciliation.parquet

Per block: `lines_sum` (sum of numeric amounts of its lines), `total_value` (TOTAL row) and
`status` (`match`, `mismatch`, `no_total_row`, `total_not_numeric`).

### audit_report.json / .md - quality audit sheet (Table 19)

Counts with denominators grouped by ISO/IEC 25012 characteristic. Contains no customer names.

## data/01_staged/retail and data/02_clean/retail - retail receipts (facturas and boletas)

No table here holds a customer's name, DNI/RUC or address (rules R305, R306).

### 01_staged/retail/receipts.parquet - one row per delivered receipt file

| Field | Meaning |
|---|---|
| raw_path | File inside `data/00_raw/retail_receipts/` (year/month/kind folders as delivered) |
| source_sha256 | SHA-256 of the file |
| folder_year, folder_month, folder_kind | Folder the owner filed it in (informative only, R301/R302) |
| doc_kind | `factura` or `boleta`, from the printed title |
| issuer_ruc, series, number | Receipt identity (issuer is the company: former or current RUC) |
| issue_date | Printed issue date |
| currency, payment_form | As printed (`SOLES`; `CONTADO`/`CRÉDITO` on facturas) |
| has_observation | Whether the observation field had text (the text is not kept) |
| customer_code | `C` + 10 hex characters: keyed hash of the DNI/RUC (or of the name when there is no document) |
| customer_kind | `person` (DNI, RUC 10/15/17), `company` (RUC 20), `unknown` |
| customer_basis | What the code is based on: `document`, `name`, `none` |
| total_amount, igv_amount, sale_value, taxed_value | Printed totals (S/) |
| n_pages, n_lines | Pages of the PDF, item lines read |
| issues | Reading problems, `;`-separated (empty when the receipt was read completely) |

### 01_staged/retail/receipt_lines.parquet - one row per printed item

raw_path, line_no, quantity, unit, description (normalised, wrapped lines joined), unit_value
(without tax), discount and sale_amount (boletas: amount with tax).

### 02_clean/retail/

| File | Content |
|---|---|
| receipts.parquet | The staged receipts plus receipt_key (`issuer-series-number`), reconciliation_gap (items minus printed total, R304), status (`valid`/`excluded`) and exclusion_reason (`unreadable`, `does_not_reconcile`, `repeated`) |
| retail_lines.parquet | Items of valid receipts: line_id, receipt_key, issue_date, doc_kind, customer_code, customer_kind, quantity, unit, description, unit_value, net_amount (= quantity × unit_value) |
| corrections.parquet | Correction log (same columns as the vecinos log): folder month and kind that differ from the printed ones (R301, R302); `line_id` holds the raw_path |
| numbering_gaps.parquet | One row per gap in a series' numbering: issuer_ruc, series, doc_kind, after_number, before_number, missing, month (empty when the gap spans two months) (R307) |
| coverage_by_month.parquet | month, doc_kind, delivered, missing_within_month, delivered_share |
| audit_report.json / .md | Counts-only quality audit of the receipts (ISO/IEC 25012) |

## data/02_clean/prices - distributor price list (reference data, no personal data)

| File | Content |
|---|---|
| price_list.parquet | item_id, source_sha256, sheet, row, family (last block heading, R401), part_number (R402), description, price, has_price (price > 0, R403), part_number_repeated (R405), extra_cells (values right of the price, R404) |
| report.json / .md | Counts by sheet, priced and unpriced items, price range |

## data/03_series/price_links - links to the price list (phase F2b)

| File | Content |
|---|---|
| text_links.parquet | source (vecinos/retail), key (SKU), text, units, method (`part_number`, `tokens`, `candidate`, `excluded`, `none`), item_id, score |
| sku_prices.parquet | sku_id, item_id, list_price, linked_units, methods - one list price per vecinos SKU |
| retail_catalog.parquet | Retail descriptions: product_text (serials removed), sku_key, sku_id (same keys as the vecinos catalog), category, lines, units, and their link (method, item_id, score) |
| merge_proposals.parquet | item_id, item_description, sku_id, sku_name, source, units - SKUs linked to the same list product |
| review_merges.md / review.md | For the owner: merge proposals; weak links (`candidate`) |
| report.json / .md | Coverage by method and channel, SKUs with list price, merge proposals, list price vs price charged |

## data/03_series - demand series (plan 2.6.2)

| File | Content |
|---|---|
| catalog_texts.parquet | product_text → sku_key, sku_id, category, lines, units - texts of both channels (receipt descriptions without serial numbers) since amendment v3 |
| catalog_skus.parquet | sku_id, sku_name (most sold text), category, n_texts, lines, units, merged |
| category_labels.json | category id → Spanish label |
| calendar.parquet | frequency, channel, period_start, period_end, split (`development`/`test`/`excluded`), recorded_days (days covered by the channel's sources: vecinos sheets, receipt dates, or either) |
| panel_development.parquet | series_id (`<frequency>:<channel>:<level>:<key>`), frequency, channel (`total` = vecinos record + delivered receipts, primary; `vecinos`; `facturado`; `total_dedup` = total without receipt lines possibly repeated in the vecinos record), level (`total`/`category`/`sku`), key, period_start, period_end, split, recorded_days, units, amount, lines - development periods only |
| sealed/panel_sealed.parquet | same columns for test and excluded periods; read only after the freeze (F8) |
| profile.parquet | per series on development periods: channel, periods, periods_with_sales, zero_share, adi, cv2, pattern (`smooth`/`erratic`/`intermittent`/`lumpy`/`no_demand`), units, mean_units, first_sale, last_sale, selected; months_with_sales, customers (distinct pseudonymous codes), top_customer_share and top_sku_share (share of units of the largest customer / SKU; SKU level: undefined), all on development lines (plan 2.6.2, Table 15) |

## outputs/runs/&lt;run_id&gt; - experiment log (Table 19)

| File | Content |
|---|---|
| predictions.parquet | series_id, model, family, origin, horizon, target_period, y_true, y_hat, train_periods, scale_mae, scale_mse, frequency |
| metrics.parquet | per series, model and horizon: origins, mae, rmse, bias, cumulative_bias, mase, rmsse, rel_mae, level, key, pattern |
| run.json | mode, condition (`full`, `truncated`, `expanding`), frequency, window, horizons and sensitivity horizons, input hashes (incl. `tuned.yaml`), models, not-implemented families, effective parameters, pinned pretrained versions, model reports (Chronos refits), seconds per model and by stage (preparation, fit, inference), peak memory, failures, `test_span_used`, environment fingerprint (incl. total memory) |

## outputs/runs/&lt;run_id&gt;-inventory - simulation log (Table 19, simulation sheet)

| File | Content |
|---|---|
| simulation.parquet | per series, model and scenario: lead_time, fill_rate_target, primary_scenario, multiplier, target_reached, calibration_fill_rate, fill_rate, demand, served, lost_units, lost_value (price known at the origin: latest period with sales in the window), lost_unpriced_units, lost_value_sensitivity and lost_unpriced_units_sensitivity (mean training price of the window), mean_on_hand, mean_safety_stock, orders, periods, level, key, pattern; since F2b list_price (SKU level, when linked), lost_value_list_fill (lost_value + unpriced lost units × list price), lost_value_at_list (all lost units × list price) |
| run.json | policy, review period, scenarios, safety-stock grid, lost-sales valuation rules, spans, input hashes, effective parameters, `test_span_used`, peak memory, environment |

## outputs/stats/&lt;timestamp&gt;-&lt;frequency&gt; - statistical comparison (phase F7)

| File | Content |
|---|---|
| he1_friedman.parquet | channel, level, horizon, statistic, p_value, series, models, mean_ranks (JSON), critical_difference (Nemenyi) |
| he1_nemenyi.parquet | model_a, model_b, p_value per stratum where Friedman rejects |
| he1_diebold_mariano.parquet | channel, horizon, model_a, model_b, series_tested, a_better, b_better (Holm across series), median_statistic |
| he2_service.parquet | per scenario and stratum: Friedman on fill rate; Wilcoxon on fill rate and mean stock per pair (Holm) |
| he2_spearman.parquet | channel, level, rho, ci_low, ci_high (series-block bootstrap), resamples, models, below_threshold |
| he3_robustness.parquet | condition (`break`/`truncated`), channel, level, horizon, Friedman on the relative change of MASE, median_change (JSON) |
| stats.json | sources (runs used), alpha, structural break, rows per table, `test_span_used` |

Validation runs with `condition = truncated` (run id `...-validation-truncated`) use the shorter
window of `truncated_length` for HE3; the dashboard always shows the full runs.

## data/private (never shared, never in Git)

| File | Content |
|---|---|
| anonymization.key | 32-byte HMAC key (owner read/write only) |
| customer_codes.parquet | Normalised customer name → customer_code (vecinos) |
| retail_customers.parquet | Retail customers: customer_code, doc_type (DNI/RUC/NONE), doc_number, customer_name |
| privacy_allowlist.txt | Optional: names the owner confirmed as ordinary words where `pcs check-privacy` found them |
