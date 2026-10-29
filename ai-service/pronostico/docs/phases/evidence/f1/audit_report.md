# Quality audit — vecinos sales record

- Source: `data/00_raw/vecinos_daily_sheets/VENTAS_INTERNAS_2024_ACTUAL_11-07-26.xlsx`
- SHA-256: `6e5ec18e84e13c3243429f5e163b30002b712b804af88b8e30d2f1a9ae19351e`

## Completeness

- **sheets total**: 569
- **sheets hidden**: 5
- **sheets with valid lines**: 556
- **staged rows**: 6003
- **rows by status**:
  - excluded: 916
  - valid: 5087
- **excluded by rule**:
  - R201: 887
  - R202: 16
  - R203: 7
  - R209: 6
- **valid lines**: 5087
- **valid units**: 5576
- **valid lines without amount**: 283

## Accuracy

- **corrections by rule**:
  - R204: 27
  - R205: 1
- **quantity imputed**: 27
- **non positive amounts**: 12

## Consistency

- **blocks total**: 567
- **reconciliation**:
  - match: 564
  - mismatch: 1
  - no_total_row: 1
  - total_not_numeric: 1
- **mismatches** (1): {'sheet_index': 381, 'block': 0, 'lines_sum': 7540.0, 'total_value': 7380.0}
- **possible duplicate lines**: 17
- **serials in more than one sale**: 45

## Credibility

- **valid lines by movement**:
  - damaged: 1
  - not_sold: 29
  - return: 290
  - sale_credit: 1
  - sale_paid: 4760
  - warranty: 6
- **valid units by movement**:
  - damaged: 1
  - not_sold: 33
  - return: 320
  - sale_credit: 2
  - sale_paid: 5214
  - warranty: 6
- **movement types confirmed**:
  - sale_paid: True
  - sale_credit: True
  - return: True
  - warranty: True
  - damaged: True
  - not_sold: True
- **unmapped codes**: {}

## Currentness

- **sheet date confidence**:
  - high: 523
  - medium: 42
  - none: 4
- **sheet date rules**:
  - R101: 569
  - R102: 2
  - R103: 21
  - R104: 1
  - R105: 543
  - R106: 2
  - R107: 3
  - R108: 15
  - R111: 4
- **valid lines by date confidence**:
  - high: 4701
  - medium: 386
- **first date**: 2024-01-03
- **last date**: 2026-09-14
- **valid lines by month**:
  - 2024-01: 382
  - 2024-02: 276
  - 2024-03: 290
  - 2024-04: 260
  - 2024-05: 177
  - 2024-06: 156
  - 2024-07: 225
  - 2024-08: 269
  - 2024-09: 250
  - 2024-10: 208
  - 2024-11: 303
  - 2024-12: 256
  - 2025-01: 213
  - 2025-02: 215
  - 2025-03: 322
  - 2025-04: 276
  - 2025-05: 123
  - 2025-06: 97
  - 2025-07: 79
  - 2025-08: 112
  - 2025-09: 92
  - 2025-10: 75
  - 2025-11: 43
  - 2025-12: 67
  - 2026-01: 87
  - 2026-02: 51
  - 2026-03: 59
  - 2026-04: 26
  - 2026-05: 32
  - 2026-07: 15
  - 2026-08: 45
  - 2026-09: 6
- **valid units by month**:
  - 2024-01: 443
  - 2024-02: 288
  - 2024-03: 339
  - 2024-04: 338
  - 2024-05: 187
  - 2024-06: 164
  - 2024-07: 252
  - 2024-08: 317
  - 2024-09: 269
  - 2024-10: 221
  - 2024-11: 337
  - 2024-12: 275
  - 2025-01: 219
  - 2025-02: 219
  - 2025-03: 345
  - 2025-04: 300
  - 2025-05: 126
  - 2025-06: 106
  - 2025-07: 81
  - 2025-08: 129
  - 2025-09: 95
  - 2025-10: 79
  - 2025-11: 43
  - 2025-12: 70
  - 2026-01: 90
  - 2026-02: 51
  - 2026-03: 60
  - 2026-04: 27
  - 2026-05: 32
  - 2026-07: 15
  - 2026-08: 46
  - 2026-09: 13
- **low confidence sheets** (0): —

## Traceability

- **every line has sheet and row**: True

## Confidentiality

- **distinct customer codes**: 270
- **valid lines without customer**: 16

## Catalog preview

- **distinct product texts**: 1213
