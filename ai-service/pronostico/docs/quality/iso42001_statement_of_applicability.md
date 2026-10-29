# ISO/IEC 42001 statement of applicability (alignment, not certification)

- Date: 2026-10-24 (F8)
- AI system: comparative demand-forecasting system for PCSystemStore (research stage).
- Role of the organisation: developer and user of the AI system; the owner of the company is the
  general manager and the researcher.

| Annex A control group | Applicable | How it is addressed | Evidence |
|---|---|---|---|
| A.2 Policies related to AI | Yes | Research protocol and its amendments define purpose, limits and the single opening of the final test | Plan de tesis; `docs/process/protocol_amendment_v3.md` |
| A.3 Internal organisation | Partly | One researcher-owner; roles of the owner (data, catalog confirmation) and of the advisor (review) are written down | `docs/process/project_plan.md`, `company_clarifications.md` |
| A.4 Resources for AI systems | Yes | Data, tools, hardware and model weights inventoried and versioned | ADR-0002, ADR-0006; lockfile; run records (`environment`, `peak_memory_mb`) |
| A.5 Assessing impacts of AI systems | Yes | AI risk register; impact on customers limited by pseudonymisation; no automated decision in the research stage | `docs/quality/ai_risk_register.md`, `docs/quality/privacy.md` |
| A.6 AI system life cycle | Yes | Phases F0-F11 with Definition of Done, verification (tests, container, SonarQube) and validation (algorithmic validity checks, final test) | `project_plan.md`; phase reports; `pcs freeze` |
| A.7 Data for AI systems | Yes | Data quality model (ISO/IEC 25012) audited; provenance per line; manifests with hashes; catalog owner-confirmed | F1, F1b, F2 reports; `data/*/manifest.json` hashes in `FREEZE.json` |
| A.8 Information for interested parties | Yes | Model cards; dashboard in Spanish for the purchasing manager; limitations stated | `docs/model_cards/`; `app/dashboard.py` |
| A.9 Use of AI systems | Yes | Intended use and out-of-scope uses per model; human approval of orders required before any production use | model cards; F11 in `project_plan.md` |
| A.10 Third-party relationships | Yes | Third-party models and libraries pinned, licences recorded (Chronos-Bolt Apache-2.0); statsforecast used only as a cross-check reference | `models.yaml`; ADR-0004, ADR-0009 |

Not applicable now: customer-facing AI services (the system has no external users) and
continuous monitoring in operation (planned for F11: prospective log and drift monitoring).
