# PHASE 8 — STEP 1 AUDIT: Phase 7 baseline & frozen contracts

> Step 1 deliverable of the Phase 8 Implementation Prompt. Read-only audit; no behaviour-changing code.

## 0. Baseline regression (as of Phase 7 acceptance)

| Check | Result |
|-------|--------|
| `uv run pytest` (backend) | 64 passed |
| `pnpm test` (frontend) | 65 passed |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | all green |
| Live servers | backend `uvicorn 0.0.0.0:8000` (job bash-36), frontend `pnpm dev` 0.0.0.0:3000 (bash-37), LAN IP 10.101.184.21 |
| Env | `.env.local`: `NEXT_PUBLIC_USE_MOCK=false`, `NEXT_PUBLIC_API_BASE_URL=http://10.101.184.21:8000` |

## 1. Activity (Phase 8-C target) — current contract

- **SQLite** (`backend/data/control-center.db` + `test-control-center.db`), `activities` table columns
  (verified via `PRAGMA table_info`): `id, type, action, message, timestamp, node_id, command_id`.
  **No association columns exist yet.**
- **SQLModel** (`backend/app/models/command.py` `Activity`): matches DB — 7 columns only.
- **Schema** (`backend/app/schemas/activity.py` `ActivityOut`): already has **nullable**
  `project_id / agent_id / session_id` (Phase 6 add). **Missing `research_project_id`.**
- **Route** (`backend/app/api/routes/activities.py`): `GET /api/v1/activities` (list, limit 50),
  `dependencies=[Depends(require_access)]`; converter `_to_out()` maps only
  id/type/action/message/timestamp/node_id/command_id → associations always `None` on output.
- **Service** (`backend/app/services/activity_service.py`): `record(session, *, type_, action, message, node_id=None, command_id=None)`
  (single write path, internal); `recent(session, limit=50)`.
- **Only current caller of `record()`**: `backend/app/services/command_service.py:141` (command lifecycle events).
- **No public POST /activities endpoint exists** (none to remove; Step 5 adds a controlled internal write path).
- **DB init** (`backend/app/db/database.py`): `SQLModel.metadata.create_all(engine)` — creates missing tables,
  **does NOT ALTER existing tables**. No migration infra exists anywhere yet (Phase 3–7 never migrated).
- **Frontend**: `Activity` type already has `projectId/agentId/sessionId` (nullable) — **no `researchProjectId`**;
  `BActivity` (src/lib/backend.ts) already has `project_id/agent_id/session_id`; `mapActivity()` maps them;
  `getActivities()` behind `USE_MOCK`; `useActivities()` 30s polling;
  `ActivityTimeline.tsx` does **not** render associations yet.

## 2. Session Plane (Phase 8-B) — current contract

- **Source of truth**: `backend/config/agents.yaml` `sessions:` (3 entries, read-only) via
  `agent_service.load_registry()/build_session()/list_sessions(agent_id)`.
- **Schema** (`backend/app/schemas/agent.py` `AgentSessionOut`): `id, agent_id, node_id, project_id?, status,
  started_at, ended_at?, last_activity_at, current_task?` — **no `research_project_id`**.
- **API**: only `GET /api/v1/agents/{agent_id}/sessions` exists (require_access).
  **No global `GET /api/v1/sessions` or `GET /api/v1/sessions/{id}`.**
- **Frontend**: `AgentSession` type (no `researchProjectId`), `mapAgentSession`, `fetchAgentSessions`,
  `useAgentSessions(id)` (no 30s poll — single fetch), `AgentSessionList` component, mock `agent-sessions.ts`,
  `agent.mappers.test.ts` covers the mapper.

## 3. Research (Phase 8-A target) — current contract

- **Schemas** (`backend/app/schemas/research.py`): 6 `*Out` models; **no `runtime` field yet**.
- **API**: 12 GET endpoints (`/api/v1/research/{projects,papers,datasets,experiments,reports,notes}` + `/{id}`),
  all `require_access`, 404 detail messages per entity. Registered in `main.py:87`.
- **Service**: `research_service` — registry-driven (`load_registry`), `KEYS=6`, `build_*`/`list_*`/`get_*`.
- **Path fields available for observation** (from `backend/config/research.yaml`):
  - Paper: `pdf_path` — **1 set** (`papers/gvhmr-2023.pdf`) — **relative** string.
  - Dataset: `path` — **4 set**, all absolute (`/Volumes/Research/mocap/v3`, `/Volumes/Research/mocap/retargeted-v1`,
    `/Volumes/Research/video/corpus`, `/Volumes/Research/papers`).
  - Report: `path` — **5 set**, all **relative** (`reports/weekly-2026-09.md`, `reports/mocap-pipeline.pdf`, …).
  - Experiment: `artifact_path` — **0 set** (all `null`).
  - ResearchProject: `repository_path` — 0 set.
- **Frontend**: types have the raw path fields; `toResearchDetailFields` displays them as text (font-mono);
  no runtime badges yet; mock `research.ts` mirrors the YAML.

## 4. Mock / Real seam (frozen)

- `src/lib/api.ts`: `USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false"`; gated per function.
- Mock modules: `nodes, metrics, services, projects, agents, activities, research (6 arrays),
  agent-sessions, robotics, storage, tasks`.
- `src/lib/backend.ts`: `request()` (fetch + 8s timeout + 401 → `silence:unauthorized`), `ApiError`,
  `getAccessToken`, all `map*`/`fetch*`.
- SSE: `GET /api/v1/events` + `GET /api/v1/auth/sse-ticket` (Phase 4 RealtimeProvider) — **untouched**.

## 5. Break-surface list (what each Step-N change would touch)

### If Activity columns change (Phase 8-C)
1. `backend/app/models/command.py` — add 4 nullable fields to `Activity`.
2. `backend/app/schemas/activity.py` — add `research_project_id` (3 exist already).
3. `backend/app/api/routes/activities.py` — `_to_out()` + (Step 5) controlled write endpoint.
4. `backend/app/services/activity_service.py` — `record()` gains 4 kwargs.
5. New idempotent migration module + hook into `init_db()` (create_all alone is insufficient).
6. DB files `control-center.db` / `test-control-center.db` — re-runnable ALTER.
7. Frontend `src/types/index.ts` (`Activity.researchProjectId`), `src/lib/backend.ts` (`BActivity`/`mapActivity`),
   `src/mock/activities.ts`, `ActivityTimeline.tsx` (render links), mapper tests.
8. Backend tests: extend `test_*` (new `test_activities.py`); regression on `command_service` event recording.

### If Research responses are enriched with `runtime` (Phase 8-A)
1. `backend/app/schemas/research.py` — add-optional `runtime` on Paper/Dataset/Experiment/Report (add-only).
2. New `backend/app/services/research_observer.py` (allow-list observer; Step 6).
3. `backend/app/services/research_service.py` / routes — enrichment point (build_* or route merge); **no YAML rewrite**.
4. Frontend types (`ResearchRuntime`), mappers, `src/lib/research.ts`, `ResearchList`/`ResearchDetail` badges,
   mock + tests.

### Session Plane additions (Phase 8-B / Step 4)
1. New `GET /api/v1/sessions`, `GET /api/v1/sessions/{id}` (+ keep `GET /agents/{id}/sessions` contract).
2. `AgentSessionOut` + frontend `AgentSession` gain `research_project_id?`.
3. Frontend `fetchSessions/fetchSession`, `useSessions/useSession`, mock, list/detail UI, tests.

## 6. Ambiguities to resolve in Step 2 (open questions, not decisions)

1. **Relative paths** (`papers/*.pdf`, `reports/*.md`): need a documented base dir (e.g. configurable
   `research_base`) or treat as `missing`/`error`. Datasets use absolute `/Volumes/Research/…` (likely absent on
   this host → observer must report `missing`, never scan).
2. **Session persistence**: extend YAML registry (minimal, read-model only) vs lightweight SQLite table
   (queryable plane + lifecycle records). Prompt asks to justify choice; plan §2.2 allows either.
3. **Activity write API shape**: internal service-only path vs restricted authenticated endpoint; plan §7 lists
   `POST /api/v1/activities` as "internal or restricted".
4. **Runtime caching/TTL** for observation (ephemeral, short TTL — plan §2.1/§B) so list endpoints stay cheap.
5. **`current_session_id` on Agent** remains `None` in YAML; whether Session Plane should auto-synthesize
   lifecycle records (Step 5) or keep manual registry records.

## 7. Contracts frozen (must not break)

- Auth: `require_access` on every new endpoint; 401 for anonymous/bare client; pairing untouched.
- Envelope: errors `{"error":{"code","message"}}`; success bare list/object; 404 detail strings unchanged.
- Research: 12 existing GET paths + response shapes remain; `runtime` is **add-only**.
- Activities `GET` returns the same fields, now with real association values (already nullable).
- `Experiment.command` remains **display-only metadata forever**; never executed.
- SSE ticket pattern + RealtimeProvider untouched (polling preferred; Step 9 decides).
- Mock/Real seam untouched; mock data updated to new shapes.
- No new heavy dependencies; no secrets in frontend/logs.

*End of Step 1 audit.*