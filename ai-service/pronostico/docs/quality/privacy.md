# Personal-data protection

Inventory of where personal data exists, how it is protected and how leaks are checked
(Peruvian Law 29733 on personal data; selected ISO/IEC 27001 controls). Updated 2026-10-23.

## What counts as personal data here

- **Vecinos record**: the buyer written in `PASE` (shop names and personal names or nicknames).
- **Retail receipts (facturas and boletas, ingested 2026-10-23)**: customer name, DNI or RUC and
  address.

Product descriptions, serial numbers, quantities, amounts and dates are not personal data.

## Where personal data lives

| Location | Content | Protection |
|---|---|---|
| `datos/` | Files as delivered | Never edited, never in Git (`.gitignore` + pre-commit hook), disk encrypted (FileVault) |
| `data/00_raw/` | Read-only copies of the delivered files | Mode 444, SHA-256 manifest, never in Git |
| `data/private/` | Pseudonymisation key, name → code table, retail customers (name, DNI/RUC → code), owner's allowlist | Folder 700, files 600, re-applied by the extraction step and by `pcs check-privacy`; never in Git |
| `data/01_staged/` onwards, `outputs/`, `docs/` | **No personal data**: buyers appear only as codes `C` + 10 hex characters | Checked by `pcs check-privacy` |

Since 2026-10-22 the buyer's name is replaced by its code **at extraction** (`pcs stage`), so no
table after the delivered files contains it. Before that change the staged table kept the raw
`PASE` text; it was regenerated without it.

## Pseudonymisation, not anonymisation

Codes are HMAC-SHA256 of the normalised name with a 32-byte random key stored only in
`data/private/anonymization.key`. Without the key the codes cannot be reversed; with it they
can, so under Law 29733 the coded data are still personal data while the key exists. Rules:

1. The key and `data/private/` never leave this computer and are never copied to shared folders,
   e-mail, cloud storage or the repository.
2. The thesis and any article publish only aggregated series and results, which contain no
   customer code at all.
3. When the study ends, deleting the key turns the coded data into anonymous data.

## Leak check: `pcs check-privacy`

`make check-privacy` (part of the Definition of Done from F1 onwards):

1. restricts `data/private/` to the owner (700/600) and reports any mode it fixed;
2. searches every file in `data/01_staged`, `data/02_clean`, `data/03_series`, `outputs/` and
   `docs/` for every known customer name of at least 4 characters, as a whole word;
3. prints matches by **customer code, file and field**, never the name, and exits with an error
   while any unconfirmed match remains.

A match can be a coincidence: a shop named after a brand or a model word that also appears in
product descriptions. Only the owner reviews those, in their own terminal:

```bash
uv run pcs check-privacy --show-names
```

If a match is an ordinary word where it appears, the owner adds the name (one per line) to
`data/private/privacy_allowlist.txt`, which is itself private. If it is a real leak, the source is
fixed instead.

Status on 2026-10-22: 8 customer names match words inside product descriptions (and one inside a
serial number) of the vecinos record; none appears in customer, code or free-text fields of the
outputs. They await the owner's review.

## Retail receipts (ingested 2026-10-23, phase F1b)

- The address is never read (rule R305).
- Name and DNI/RUC exist only in memory while a receipt is read, and then only in
  `data/private/retail_customers.parquet` (600). Every other table holds the customer code: the
  keyed hash of the DNI/RUC with the same key (R306), and the customer kind (person/company).
- The observation text is not kept, only whether it had text.
- `pcs check-privacy` searches every known retail name and DNI/RUC number, and flags any customer
  column that holds a bare 8- or 11-digit number instead of a code.
- Status on 2026-10-23: no retail customer name or DNI/RUC outside `data/private/`.
- The PDFs themselves contain personal data: they stay in `datos/` and `data/00_raw/` (never in
  Git; the pre-commit hook also blocks `.pdf` files).

## Reference data

The distributor price list (`datos/LISTA DISTRIBUCION*.xlsx`) holds products, part numbers and
prices only. Its words do match some one-word vecinos nicknames in `pcs check-privacy`, which shows
those nicknames are ordinary product words (brands, models).

## Owner review of the remaining matches (2026-10-26)

The owner reviewed every remaining `pcs check-privacy` match with `--show-names` in the owner's
own terminal. The researcher's tools showed only customer codes.
- 4 matches are names of vecinos (resellers) or of their shops that appear inside product
  descriptions, serial-number fields or the project documents. They are business names, not
  personal data, and were added to `data/private/privacy_allowlist.txt`.
- The other 7 coded matches (74 of the 93 file-level matches) are ordinary words. The owner
  judged them not relevant to confidentiality and accepted them as residual matches, so
  `pcs check-privacy` keeps listing them by code.
- No DNI/RUC appears outside `data/private/`.

## Other exposure points

| Point | Control |
|---|---|
| Dashboard | Serves only on `127.0.0.1` (`.streamlit/config.toml`, `make dashboard`); shows no customer data |
| SonarQube | Bound to `127.0.0.1`; analyses code only, never data |
| Test fixtures and documentation | Fictitious customer names only (ALFA, BETA, …) |
| AI assistant sessions | During the first exploration of the vecinos record (2026-10-21) the most frequent buyer names were displayed in the assistant's session. From then on, profiling of personal fields reports only counts and formats |
