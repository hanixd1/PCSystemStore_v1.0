# ADR-0003 — Quality framework and ISO alignment

- Status: accepted
- Date: 2026-10-21

## Context

The software must be built to recognised quality standards and pass SonarQube. Several of the
standards requested (ISO 9001, ISO/IEC 42001) certify **organisations' management systems**, not
software products, and a thesis cannot be certified against them.

## Decision

The project is **aligned with** (not certified against) this set of standards. Each standard is
turned into concrete artifacts listed in the [quality plan](../quality/quality_plan.md):

| Scope | Standard |
|---|---|
| Life-cycle process for a one-person team | ISO/IEC 29110 (Basic profile); ISO/IEC/IEEE 12207 as reference |
| Quality management principles | ISO 9001 through ISO/IEC/IEEE 90003 (software guidance) |
| Product quality model | ISO/IEC 25010:2023, extended for AI by ISO/IEC 25059 |
| Data quality model | ISO/IEC 25012 |
| Quality evaluation | ISO/IEC 25040, planned per ISO/IEC 25001 |
| AI management and risk | ISO/IEC 42001 (selected Annex A controls), ISO/IEC 23894 |
| Testing | ISO/IEC/IEEE 29119 |
| Security and privacy | ISO/IEC 27001 (selected controls), Peruvian Law 29733 |

SonarQube Community Build runs locally in Docker and enforces the code-level part of ISO/IEC 25010
(maintainability, reliability, security) through a quality gate. Scientific validity (no leakage,
correct metrics, sealed test) is enforced by tests and by the protocol module, not by SonarQube.

## Consequences

- Wording in the thesis: "aligned with" or "based on", never "compliant" or "certified".
- Quality artifacts grow with each phase; the traceability matrix in the quality plan is updated
  in every phase report.
- SonarQube's "new code" definition needs Git history, so the repository is versioned from F0.
