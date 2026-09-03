# PHASE 8 PLAN — Runtime & Activity Plane

**Project:** Silence Personal Control Center  
**Version:** v0.1  
**Phase:** Phase 8  
**Status:** Planning (not started)  
**Date:** 2026-09-03  
**Depends on:** Phase 0–7 completed (Environment → Architecture → UI → Backend/Node → Realtime → Projects → Agents → Research Metadata)

---

## 1. Objective

Phase 8 transforms the Control Center from **static metadata control planes** into a **unified Runtime & Activity Plane**.

After Phase 7 the system already answers:

> “What research projects, papers, datasets, experiments, reports and notes exist?”

Phase 8 must answer:

> “What is their **real current state** on disk, how did that state change over time, and how are Agents / Sessions / Projects / Research connected through a persistent Activity timeline?”

Core progression:

```
Phase 7
Research Metadata (YAML READ)
        ↓
Phase 8
Real filesystem observation
  + Session Plane
  + Activity Persistence
  + Runtime State Aggregation
        ↓
True Runtime State (still READ-ONLY)
```

**Phase 8 is Runtime Observation, NOT Runtime Execution.**

---

## 2. Scope Definition — Four Sub-Planes

### 2.1 Phase 8-A — Research Runtime Observation

Connect Phase 7 static YAML metadata to the real filesystem **inside configured paths only**.

| Entity | Observable facts (READ only) | Explicitly NOT done |
|--------|------------------------------|---------------------|
| Paper | `pdf_path` → exists / missing / size / modified_at | No PDF parsing, no OCR, no content extraction |
| Dataset | `path` → exists / missing / size / last_modified | No full 2TB scan, no recursive deep tree walk beyond configured path |
| Report | `path` → exists / missing / size / modified_at | No content rendering / conversion |
| Experiment | `artifact_path` exists + status enrichment from observation | No command execution, no process spawn |

Rules:

- Only paths that appear in `backend/config/research.yaml` (or a future explicit allow-list) may be inspected.
- Missing / invalid / permission-denied paths must degrade gracefully to `missing` / `error` status; they must **never** trigger a scan of `/`, `$HOME`, or the entire 2TB SSD.
- Observation results are ephemeral or lightly cached; they do not rewrite the YAML registry.

### 2.2 Phase 8-B — Session Plane

Formalise the Session model introduced in Phase 6 into a first-class, persistent (or registry-backed) plane that links:

```
Agent
  └── Session
        ├── Project (Phase 5)
        ├── Research Project (Phase 7)
        └── Activities
```

Session is still a **read-model + lifecycle record**. No start/stop/execute buttons that spawn real processes.

Minimum Session fields (aligned with Phase 6 + extensions):

- `id`, `agent_id`, `node_id`, `project_id?`, `research_project_id?`
- `status` ∈ `created | running | completed | failed | cancelled`
- `started_at`, `ended_at?`, `last_activity_at`, `current_task?`

### 2.3 Phase 8-C — Activity Persistence

Close the gap left by Phase 6/7:

- Schema already contains nullable `project_id` / `agent_id` / `session_id`.
- SQLite table must be migrated (idempotent `ALTER TABLE`) to persist:
  - `project_id`
  - `agent_id`
  - `session_id`
  - `research_project_id` (new)

Activity becomes the single event spine of the Control Plane:

```
13:00  Session started          (agent + project)
13:01  File observed changed    (research paper)
13:02  Dataset detected         (research)
13:04  Experiment artifact seen
13:05  Session completed
```

Write path is controlled and audited; still no arbitrary shell or command execution.

### 2.4 Phase 8-D — Runtime State Aggregation

Produce a coherent Runtime State view that the Dashboard and detail pages can consume:

```
File System  ──observation──►  Runtime State
                                 ▲
Projects ────────────────────────┤
Research ────────────────────────┤
Sessions ────────────────────────┤
Activities ──────────────────────┘
```

This aggregation layer is the foundation for future Agent Runtime / Research Execution / RAG, but those execution planes remain **out of scope**.

---

## 3. Explicit Non-Goals (Hard Boundaries)

Phase 8 **MUST NOT** implement any of the following:

| Forbidden | Reason |
|-----------|--------|
| PDF content parsing / OCR | Execution / content plane |
| Embedding / Vector DB / RAG | Research Execution |
| Research Agent that acts | Execution |
| Automatic execution of Experiment `command` | Execution |
| Automatic paper / dataset download | External write + network side-effect |
| Scanning `/`, `$HOME`, or entire 2TB SSD | Security + scope explosion |
| Auto-modification of Research YAML or Project registry | Write plane |
| Auto-execution of Agent tasks / shell / git write / docker control | Execution |
| Shutdown / reboot / arbitrary `pmset` changes | Already forbidden since Phase 3 |
| New authentication schemes that bypass device pairing | Security regression |

Any implementation that crosses these lines is considered **out of scope and must be rejected**.

---

## 4. Architecture Principles (Inherited + New)

1. **Local-first / Non-invasive** — continue to respect existing Second Brain, Docker, Conda, Robotics projects.
2. **Capability & Allow-list** — filesystem observation is a new capability (`research_fs_observe` or similar) declared per node; only configured paths.
3. **Read-first** — Observation and persistence of events; no control actions beyond the existing Sleep/Wake allow-list.
4. **Registry-driven** — Research, Agents, Projects remain YAML-registered; Activity is the only new SQLite mutation.
5. **Idempotent migration** — SQLite changes must be safe to re-run.
6. **Mock/Real seam preserved** — `NEXT_PUBLIC_USE_MOCK` continues to work; mock data must be updated to the new shapes.
7. **No new heavy dependencies** unless absolutely required and justified in the plan review.
8. **Security boundary unchanged** — `require_access`, CORS whitelist, no secrets in frontend, no token in URL for long-lived credentials (SSE ticket pattern may be reused if needed).

---

## 5. Recommended Implementation Order

Strict sequential order. Each major step ends with a **STOP** gate for human review before the next step begins.

```
Step 1   Audit Phase 7 baseline & freeze contracts
Step 2   Architecture decision record (this document + any deltas)
Step 3   SQLite Activity migration (project_id / agent_id / session_id / research_project_id)
Step 4   Session Plane (registry + service + API + basic persistence)
Step 5   Activity write path + association population
Step 6   Research filesystem observer (configured paths only)
Step 7   Runtime State aggregation service
Step 8   Frontend integration (Session list/detail, Activity associations, Research runtime badges)
Step 9   Realtime / polling integration (extend existing 30 s / SSE patterns carefully)
Step 10  Testing (backend + frontend + security path tests)
Step 11  LAN / iPad verification
Step 12  Documentation (phase-8-runtime-activity-plane.md + COMPLETION_REPORT)
```

**Priority rule:** Activity + Session first, Research filesystem observer second.  
Do not build Research runtime status before the event spine exists; otherwise the system will need rework.

---

## 6. Data Contracts (Target)

### 6.1 Activity (extended)

```text
Activity
├── id
├── type
├── action
├── message
├── timestamp          (ISO 8601)
├── node_id?
├── command_id?
├── project_id?        ← persisted
├── agent_id?          ← persisted
├── session_id?        ← persisted
└── research_project_id? ← new, persisted
```

### 6.2 Session

```text
AgentSession
├── id
├── agent_id
├── node_id
├── project_id?
├── research_project_id?
├── status
├── started_at
├── ended_at?
├── last_activity_at
└── current_task?
```

### 6.3 Research Runtime Observation (additive fields)

For Paper / Dataset / Report / Experiment (and optionally ResearchProject):

```text
runtime:
  exists: bool
  missing: bool
  size_bytes?: int
  modified_at?: ISO 8601
  error?: string          # permission / invalid path, never stack traces
```

These fields are produced by the observer; they do **not** rewrite the YAML source of truth.

---

## 7. API Surface (Additive)

All new endpoints remain under `/api/v1/` and behind `require_access`.

Suggested additions (exact paths may be refined in Step 2):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/sessions` | List sessions |
| GET | `/api/v1/sessions/{id}` | Session detail |
| GET | `/api/v1/agents/{id}/sessions` | Already exists; keep contract |
| GET | `/api/v1/activities` | Already exists; now returns associations |
| POST | `/api/v1/activities` (internal or restricted) | Controlled write path for system events only |
| GET | `/api/v1/research/...` | Existing; response enriched with optional `runtime` object |
| GET | `/api/v1/runtime/state` (optional aggregate) | Dashboard summary |

No public “execute experiment” or “parse PDF” endpoints.

---

## 8. Frontend Expectations

- Session list + Session detail pages (or deep links from Agent / Project / Research).
- Activity timeline shows linked Project / Agent / Session / Research when present.
- Research list/detail cards display runtime badges: `exists` / `missing` / `stale` / error.
- Loading / offline / sleeping / stale states continue to use the Phase 4 reachability model.
- Mock data updated so `NEXT_PUBLIC_USE_MOCK=true` remains usable for demo.
- No new global state libraries; continue hooks + existing providers.

---

## 9. Testing & Acceptance Criteria

### Backend

```bash
cd backend && uv run pytest   # must stay green; new tests added
```

Minimum coverage:

- Idempotent Activity migration
- Session list / detail / association to Agent / Project / Research
- Activity persistence with all four association fields
- Filesystem observer: exists / missing / invalid path / permission failure
- Observer never walks outside configured paths
- `command` field is never executed
- Auth: bare client → 401 on new endpoints
- Registry compatibility (missing YAML files degrade safely)

### Frontend

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Minimum coverage:

- Session list / detail rendering
- Activity association display
- Research runtime status badges (exists / missing / error)
- Offline / sleeping / stale handling
- Mock / Real seam still works

### Security / Safety

- Path `/path/does/not/exist` → missing, no scan of `/` or home
- Experiment `command` string is display-only forever
- No new secrets in frontend or logs
- No regression of Sleep/Wake allow-list or device pairing

### Manual / LAN

- iPad landscape 1366×1024 and portrait
- Real Mac paths for a few registered papers/datasets produce correct exists/missing
- Activity timeline shows new association fields after controlled writes

---

## 10. Documentation Deliverables

At the end of Phase 8 the following documents must exist:

```
docs/
├── PHASE_8_PLAN.md                          ← this file
├── phase-8-runtime-activity-plane.md        ← architecture + implementation notes
└── PHASE_8_COMPLETION_REPORT.md             ← what was done, test results, known issues, Phase 9 recommendation
```

---

## 11. Phase 9 Orientation (Out of Scope for Phase 8)

Only after Phase 8 is accepted:

- Agent Runtime / controlled execution plane
- Research Execution (still carefully bounded)
- Deeper Second Brain integration
- Optional RAG / embedding experiments (separate gated phase)

Phase 8 must leave a clean event spine and observation layer so those later phases do not require architectural rewrites.

---

## 12. Success Definition (Definition of Done)

Phase 8 is complete when:

1. Activity table persists `project_id`, `agent_id`, `session_id`, `research_project_id`.
2. Session Plane is queryable and linked to Agent / Project / Research.
3. Research entities can report real filesystem existence (configured paths only).
4. Dashboard / Activity timeline reflects associations and runtime state.
5. All automated tests pass; no forbidden capabilities were introduced.
6. Documentation (plan + architecture + completion report) is written.
7. iPad LAN verification confirms the new surfaces.

Until the human reviewer signs off at each STOP gate, the implementer must not advance to the next step.

---

## Appendix A — Relationship to Previous Phases

| Phase | Deliverable | Phase 8 relationship |
|-------|-------------|----------------------|
| 0 | Environment audit | Constraints (non-invasive, sleep-aware, multi-node ready) still bind |
| 1 | System architecture | Node / Capability / Command / Event model continues |
| 2–4 | UI + Backend + Realtime | Reuse shell, providers, polling/SSE patterns |
| 5 | Projects Control Plane | `project_id` association target |
| 6 | Agent Control Plane | Session model origin; `agent_id` / `session_id` |
| 7 | Research Metadata | Source of paths to observe; `research_project_id` |

Phase 8 is the first **horizontal** connection phase, not another isolated vertical module.

---

## Appendix B — Risk Register

| Risk | Mitigation |
|------|------------|
| Accidental full-disk scan | Hard path allow-list from registry only; unit tests for invalid roots |
| Migration breaks old Activity rows | Nullable columns + idempotent migration; old rows keep null associations |
| Frontend/backend type drift | Update shared types + mappers together; mapper unit tests |
| Scope creep into execution | STOP gates + explicit forbidden list in the Implementation Prompt |
| Performance of many path checks | Limit to registered entities; optional short TTL cache; no recursive deep walks |

---

**End of PHASE_8_PLAN.md**
