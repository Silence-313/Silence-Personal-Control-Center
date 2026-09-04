# Phase 9 — Knowledge & Automation Plane

**Project:** Silence Personal Control Center
**Version:** v0.1
**Phase:** Phase 9
**Status:** Complete
**Date:** 2026-09-04
**Depends on:** Phase 0–8 completed (Environment → Architecture → UI → Backend/Node → Realtime → Projects → Agents → Research → Runtime/Activity)

---

## 1. Objective

Phase 9 lays the foundation of a **Personal Operating System**: a machine-readable **Knowledge Graph** that automatically indexes every entity already managed by the control center (projects, agents, research, sessions, activities), a **Context aggregation** layer that assembles everything relevant to a single entity into one read-only bundle, and a **safe Automation engine** driven by declarative YAML rules.

```
Phase 7/8   Metadata + Runtime observation (READ-ONLY)
    ↓
Phase 9    Automatic Knowledge Index (graph)
           + Unified Context aggregation
           + Declarative, safe-only Automation
    ↓
future     Personal OS reasoning / agent context provider
```

Everything remains **metadata + context only**. Phase 9 does not execute shell, does not modify code, does not call external services or LLMs, and does not change any Phase 0–8 contract.

## 2. Architecture Decisions (approved at STEP 0)

| # | Decision | Chosen option |
|---|----------|---------------|
| A | Knowledge source | **Automatic indexing** of the existing registries/live tables, **plus a manual override** registry (`config/knowledge.yaml`) |
| B | Automation notification | **In-process SSE pub/sub queue** (no external queue service) |
| C | Automation definition | **YAML rules** (`config/automation.yaml`) + **SQLite execution state** (`automation_rules`) |
| D | Event matching | **Lightweight match** — a pure `match(rule, event)` predicate + emit points |
| E | Search | **SQLite `LIKE`** substring search (no FTS5, no external index) |

## 3. Data Model

Three SQLite tables, all additive and registered in `app/models/__init__.py`:

- **`knowledge_items`** — one row per indexable entity. `/metadata` columns stored identically to other planes.
  - `id` (PK) is **namespaced**: `"paper:paper-gvhmr"`, `"session:sess-…"`. Namespacing removes any cross-type `id` collision.
  - `type` ∈ {`project`, `agent`, `research`, `paper`, `dataset`, `experiment`, `report`, `note`, `session`, `activity`}; `entity_id` = raw id (prefix stripped); `title`, `summary`, `tags` (JSON), `meta` (JSON, DB column `metadata` — the SQLAlchemy-reserved attribute name forced the Python field to be `meta` while keeping the stored column name), timestamps.
- **`relations`** — directed edges with a deterministic id `"{source}|{type}|{target}"`.
  - `relation_type` ∈ {`belongs_to`, `uses`, `generated_by`, `depends_on`, `references`, `derived_from`}.
- **`automation_rules`** — per-rule **execution state only** (`name`, `enabled`, `last_matched_at`, `last_run_at`, `run_count`). The rules themselves live in YAML, never in SQLite.

## 4. Knowledge Indexing

`app/knowledge/service.py` builds the index at database init (`init_db → knowledge_service.sync`) and on every startup, idempotently (upsert by id).

Derivation sources:

- **Static** (registry read models): `projects.yaml`, `agents.yaml`, `research.yaml` (research projects + the 5 paper/dataset/experiment/report/note kinds).
- **Live** (SQLite tables): `SessionRecord` → `session:*`, `Activity` → `activity:*`.
- **Manual override**: `config/knowledge.yaml` — `items` (raw `id` + `type` + `title`/`summary`/`tags`/`metadata`) and `relations` (namespaced `source_id`/`target_id`/`relation_type`). Adds or overrides anything the auto-index cannot express (e.g. `depends_on` / `derived_from`, which have no auto source).

### Relation derivation

| source | type | target | via |
|--------|------|--------|-----|
| research | `references` | project | `research.project_id` |
| paper / dataset / experiment / report / note | `belongs_to` | research | `research_project_id` |
| experiment | `uses` | dataset | `dataset_id` |
| agent | `references` | project | `current_project_id` |
| session | `generated_by` | agent | `agent_id` |
| session | `references` | project / research | `project_id` / `research_project_id` |
| activity | `references` | agent / session / project / research | association columns |

## 5. Context Aggregation

`app/services/context_service.py` answers *"what is relevant to entity X?"* by reusing the existing **plane services** and the knowledge relation graph. **Read-only**, never mutates state, never adds database rows.

`GET /api/v1/context/{type}/{id}` returns a `ContextOut`: the entity itself, its relation edges, and populated buckets of connected `projects` / `agents` / `sessions` / `research_projects` / `papers` / `datasets` / `experiments` / `reports` / `notes` / `activities`, plus a `generated_at` timestamp.

`GET /api/v1/context/provider/{agent_id}` returns an `AgentContextProviderOut` — a curated bundle for an agent/AI consumer (current project, related research, recent activities + failures).

Scope is assembled from the entity's **own association fields** and expanded by walking the relation graph neighbours (both directions — e.g. a project finds the research projects that `references` it and every agent/session attached to it).

## 6. Automation Engine

`app/automation/`:

- **`rules.py`** — `Trigger`/`Action`/`Rule` read models + `load_rules()` from `config/automation.yaml` (with an in-process cache). Non-safe actions (`shell`, `command`, webhook…) are **dropped** at parse time with a warning.
- **`engine.py`** — `matches()`, `evaluate()`, `on_activity_created()`, `sync_state()`.
  - Actions are restricted to `create_activity` (through the Activity spine) and `notify` (through the SSE queue). Message templating supports `{message}`, `{value}`, `{entity_id}`, `{rule_id}`, etc.
  - The only **live-wired trigger** is `activity.created`, hooked from the *inside* of `activity_service.record()` (the single write path). Automation-produced activities use `type="automation"` and are **excluded** from re-triggering, which prevents recursion.
  - `experiment.updated`, `agent.failed`, `node.offline`, `project.changed` are fully matchable and unit-tested, but have **no production emitter in v1** (the registries are static and the heartbeat loop has no offline detector) — documented below.

### SSE notification queue (`app/services/sse_service.py`)

`start_notifications()` binds the queue to the running event loop at startup; `publish_notification(data)` enqueues thread-safely and returns `False` when the pub/sub is not running (e.g. under a loop-less TestClient); `drain_notifications()` is an async generator drained by the existing `event_stream()` before each metrics tick. The first three SSE yields (`hello`, `node_status`, `metrics`) are preserved, so the Phase 4 contract and `test_event_stream_yields` remain intact.

## 7. API Surface (all `require_access`, all read-only except none)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/v1/knowledge?q=&type=&tag=` | `list[KnowledgeItemOut]` (LIKE search) |
| GET | `/api/v1/knowledge/{item_id}` | `KnowledgeItemOut` (404 on miss) |
| GET | `/api/v1/relations/{id}` | `list[RelationOut]` (namespaced **or** bare `id`) |
| GET | `/api/v1/context/{type}/{id}` | `ContextOut` (404 on miss / unknown type) |
| GET | `/api/v1/context/provider/{agent_id}` | `AgentContextProviderOut` (404 on miss) |
| GET | `/api/v1/automation/rules` | `list[AutomationRuleOut]` (YAML + execution state) |

No write endpoint is exposed for knowledge or automation — knowledge is auto-indexed + manual-YAML, and automation rules are authored in YAML only.

## 8. Frontend

- New domain types in `src/types/index.ts` (`KnowledgeItem`, `Relation`, `ContextData`, `AutomationRuleState`, `KnowledgeType`, `RelationType`).
- `src/lib/backend.ts` — `B*` raw shapes + mappers (`mapKnowledgeItem` / `mapRelation` / `mapContext` / `mapAutomationRule`) + fetchers.
- `src/lib/api.ts` — the mock/real seam (`getKnowledgeItems` / `getKnowledgeItem` / `getRelations` / `getContext` / `getAutomationRules`); `src/mock/knowledge.ts` mirrors the index.
- `src/hooks/index.ts` — `useKnowledgeItems` / `useContextData` / `useAutomationRules`.
- New routes: `/knowledge` (search + type-filtered list + automation rules) and `/context/[type]/[id]` (aggregated context view). New `src/app/knowledge`, `src/app/context/...`, and `src/components/knowledge/*`, plus `NAV_ITEMS` and `zh` i18n keys.

## 9. Safety & Constraints

- **Read-only** observation everywhere; no shell, no code modification, no external service, no VectorDB/RAG/LLM.
- Automation action allow-list enforced in code (`TRIGGER_TYPES`, `ACTION_TYPES`).
- Automation recursion guarded (`type == "automation"` short-circuits the `activity.created` emitter).
- `notify` is best-effort; `create_activity` is the always-reliable action (the event is recorded even when the SSE pub/sub is unavailable).

## 10. Verification

- Backend: **115 pytest passing** (93 baseline + 22 new across `test_knowledge.py`, `test_context.py`, `test_automation.py`).
- Frontend: **80 vitest passing** (75 baseline + 5 new); `tsc --noEmit`, `next lint`, and `next build` all clean.
- Live smoke: `/knowledge?type=paper` → 8 items; `/context/project/second-brain` resolves agents/research/sessions; `/context/...` miss → 404; `/automation/rules` → both demo rules; `/relations/research:research-g1` → 11 `belongs_to` edges.