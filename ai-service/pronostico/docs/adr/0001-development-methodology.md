# ADR-0001 — Development methodology

- Status: accepted
- Date: 2026-10-21

## Context

The thesis (*Plan ts v2*, chapter II) fixes the **research** method: hypothetico-deductive,
paired computational benchmarking with rolling-origin validation and discrete-period inventory
simulation, organised in six chained phases with the configuration frozen before the final test
is opened once. The plan also commits to building a **software artifact** (the comparative
system) and needs a process for building it. There is a single developer and a fixed calendar
(stage III of the Gantt chart, about seven months).

## Decision

1. Software process: **Scrum adapted to one developer**, i.e. incremental and iterative
   development in two-week sprints. The product backlog is derived from the specific objectives
   (OE1–OE3) and from the six instruments of Table 19.
2. Process framework for documentation: **ISO/IEC 29110 Basic profile** (Project Management and
   Software Implementation processes for very small entities). See
   [project plan](../process/project_plan.md).
3. Increments map to phases F0–F11. Each phase consumes the frozen outputs (with hashes) of the
   previous one and ends with code, tests passing on the host and in Docker, the SonarQube quality
   gate, and a report in `docs/phases/` with its evidence.
4. The six research phases of the plan are not replaced. They map onto F1, F2, F8, F9 and F10.
5. CRISP-DM and Design Science Research are **not** added: the plan's six phases already play
   the data-lifecycle role, and a second framework would duplicate the methodology chapter.

## Consequences

- The thesis report can describe a single process: research phases (plan) implemented by
  software increments (this ADR).
- Every increment is small enough to verify before the next starts; the end-to-end path with
  simple models (F3) is reached before complex models are added.
- The Definition of Done is shared by every phase (project plan, section 4).
