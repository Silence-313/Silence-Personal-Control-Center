# Phase 8 — Runtime & Activity Plane

**Project:** Silence Personal Control Center
**Version:** v0.1
**Phase:** Phase 8
**Status:** Complete
**Date:** 2026-09-03
**Depends on:** Phase 0–7 completed (Environment → Architecture → UI → Backend/Node → Realtime → Projects → Agents → Research Metadata)

---

## 1. Objective

Phase 8 turns the Control Center from **static metadata control planes** into a **unified Runtime & Activity Plane**.

Phase 7 answered *"what research projects / papers / datasets / experiments / reports / notes exist?"* Phase 8 now answers *"what is their **real current state on disk**, how did it change over time, and how are Agents / Sessions / Projects / Research connected through a persistent Activity timeline?"*

The progression is:

```
Phase 7  Research Metadata (YAML READ)
   ↓
Phase 8  Real filesystem observation
         + Session Plane
         + Activity Persistence
         + Runtime State Aggregation
   ↓
True Runtime State (still READ-ONLY)
```

**Phase 8 is Runtime Observation, NOT Runtime Execution.** It never runs a command. `Experiment.command` remains display-only, forever.

---

## 2. What shipped

### 2.1 Runtime observation (filesystem, READ-ONLY)

- New module `backend/app/services/research_observer.py`.
- `resolve_candidate(path_field)` resolves an allow-listed path from `research.yaml`:
  - Absolute paths → used as-is.
  - Relative paths → joined to `research_base` (config `control_center_research_base`), then `.resolve()`ed.
  - **Containment enforced**: a resolved path outside `research_base` is rejected with `"path escapes research_base"`.
  - `None`/empty → `missing`; unset `research_base` + relative path → `missing`.
- `_observe_uncached` runs a **single `os.stat`** per path:
  - `FileNotFoundError` → `missing=True`
  - `PermissionError` → `error="permission denied"`
  - other `OSError` → `error=type(exc).__name__`
  - success → `exists=True` + `size_bytes` + `modified_at` (ISO 8601 `Z`).
- **TTL cache** (default 30 s, in-memory, never persisted) via `_cache` + `_previous`.
- A **flip of `exists`** (vs. per-key previous state) queues a change, which the API layer drains into the Activity spine with `research_project_id`. First observation after a process restart has no baseline, so it records nothing (documented behavior).

### 2.2 Session Plane

- New table `sessions` (`SessionRecord`, 9 columns):
  `id, agent_id(index), node_id, project_id?, research_project_id?, status, started_at, ended_at?, last_activity_at, current_task?`.
- `backend/app/services/session_service.py`: `seed_from_registry` (idempotent, reads `agents.yaml`, only when the table is empty), `list_all`, `get`, `list_by_agent`, and **internal-only** `create` / `transition`.
  - Statuses: `created / running / completed / failed / cancelled`; terminal statuses auto-fill `ended_at`.
  - `create` / `transition` also write associated Activities (Section 2.3).
- New endpoints (additive, ADR-6):
  - `GET /api/v1/sessions`
  - `GET /api/v1/sessions/{id}` (404 `"Session not found"`)
- `AgentSessionOut` gains `research_project_id` (add-only). `/api/v1/agents/{id}/sessions` now delegates to `session_service.list_by_agent` (`research-agent-session-001` is now an empty list, per ADR).

### 2.3 Activity persistence (write path)

- `Activity` gains 4 nullable association columns: `project_id, agent_id, session_id, research_project_id`.
- `backend/app/db/migrations.py` introduces an idempotent **migration** (`migrate(engine)`) that `ALTER TABLE activities ADD COLUMN …` only when a column is absent; `init_db()` calls it after `create_all`. (`create_all` does not alter existing tables — this is why an explicit migration was required.)
- `backend/app/services/activity_service.py: record(...)` is the **single, internal-only write path**. There is **no public POST** for activities. Session lifecycle + research observation changes flow through it with known associations; unknown associations stay `None`.

### 2.4 Runtime aggregation

- New schema `backend/app/schemas/runtime.py`:
  - `ObservedPathSummary{kind, entity_id, label, research_project_id?, runtime}`
  - `RuntimeStateOut{counts, observed, observed_paths, recent_activities, generated_at}`
- `backend/app/services/runtime_service.py`:
  - `observed_paths()` iterates the 4 path-bearing research kinds (`papers.pdf_path`, `datasets.path`, `experiments.artifact_path`, `reports.path`).
  - `runtime_state(session)` aggregates counts (projects / agents / sessions / activities / 6 research kinds), the observed-path summary, and the 10 most recent activities (mapped to `ActivityOut`).
- New endpoint `GET /api/v1/runtime/state` → `RuntimeStateOut`.

### 2.5 Frontend (iPad-first)

- **Sessions**: new `src/app/sessions/page.tsx` + `src/app/sessions/[id]/page.tsx`, `SessionCard` component, `useSessions` / `useSession` hooks, `getSessions` / `getSession` API + fetch, `nav.sessions` sidebar entry.
- **Activity associations**: `ActivityTimeline` now renders association chips/links for `researchProjectId → /research/projects/[id]`, `projectId → /projects/[id]`, `agentId → /agents/[id]`, `sessionId → /sessions/[id]`.
- **Research runtime badge**: new `RuntimeBadge` component (exists→success / missing→neutral / error→error / stale→warning) shown on research list cards and as an "on-disk status" section on research detail. Backend `RuntimeOut` → frontend `ResearchRuntime` via `mapRuntime`.
- **i18n / types / mock**: `ResearchRuntime` type + optional `runtime` on Paper/Dataset/Experiment/ResearchReport; `Activity.researchProjectId`; zh keys; mock entries demonstrating exists/missing/stale states.

---

## 3. Architecture decisions (ADR digest)

See `docs/PHASE_8_STEP2_ADR.md` for full rationale. Summary:

| ADR | Decision |
|-----|----------|
| ADR-1 | `research_base` config (default `None` → relative paths `missing`); containment enforced; never scan `/`, `$HOME`, or the 2 TB SSD. |
| ADR-2 | Sessions = lightweight SQLite table, seeded idempotently from `agents.yaml` (YAML never rewritten). |
| ADR-3 | Activity writes internal-only; **no public POST**. |
| ADR-4 | Observation uses in-memory TTL cache (default 30 s); never persisted. |
| ADR-5 | Session create/transition internal-only. |
| ADR-6 | Additive GET endpoints only; `AgentSessionOut` +`research_project_id` (add-only). |

---

## 4. Contracts preserved (Phase 3–7)

- `require_access` auth gate, SSE ticket, Sleep/Wake allow-list: **unchanged**.
- Mock/Real seam (`USE_MOCK`) intact; every new fetch path routed through `api.ts`.
- Add-only response fields (no field removed or reinterpreted).
- `realtime.tsx`/SSE untouched; polling stays at `MEDIUM_REFRESH_MS = 30 s` with `silence:wake` refetch + 3 s/8 s retries.
- No new heavy dependencies (stdlib `os`/`pathlib`/`uuid` only).

---

## 5. Security & invariants

- **Read-only**: observation does `os.stat` only; no read of file contents, no execution.
- **Allow-list only**: paths come solely from `research.yaml` registries; containment against `research_base` is checked per path.
- **No PDF parsing / OCR / embedding / VectorDB / RAG / Research Agent / auto-download**.
- **No secrets** in frontend or logs.
- `research.yaml` / `projects.yaml` / `agents.yaml` are **never** rewritten.
- Git state: **NOT COMMITTED**.

---

## 6. Test & verification baseline

- Backend `pytest`: **93 passed** (new: `test_db_migration` 4, `test_sessions` 8, `test_activities` 4, `test_research_observer` 11, `test_runtime` 2; `test_agents` session tests rewritten to real seeded ids).
- Frontend: `pnpm test` **75 passed** (12 files), `tsc --noEmit` clean, `next lint` clean, `next build` succeeds with `/sessions` + `/sessions/[id]` in the route manifest.
- Live verification (Phase 8 backend restarted + frontend dev):
  - LAN (`10.101.184.21`): `/`, `/sessions`, `/research/papers`, `/activity` → **200**.
  - Backend `/api/v1/health` (LAN) → **200**; `/api/v1/sessions` without credentials → **401** (auth gate active).
  - `GET /api/v1/sessions` → **3 seeded sessions** (`coding-agent-session-001`, `coding-agent-session-002`, `research-agent-session-001`).
  - `GET /api/v1/research/papers` → 8 papers, each with `runtime` (`exists:false, missing:true` on this host — `research_base` unset and `/Volumes/Research` absent).
  - `GET /api/v1/runtime/state` → counts `{projects:7, agents:5, sessions:3, activities:18, research_projects:6, papers:8, datasets:5, experiments:8, reports:5, notes:8}`, `observed_paths: 26` (all `missing` on this host).
  - `/api/v1/nodes/macbook-pro/power` → **200**; SSE ticket + `/api/v1/events` → **200** (stream stays open).