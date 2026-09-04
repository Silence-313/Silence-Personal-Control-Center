# PHASE 10 — Observability & Intelligence Plane

> Silence Personal Control Center v0.1 — upgrade from an entity-management
> platform to an *observable* operating system. This document describes the
> architecture, APIs, database changes, frontend, realtime integration, tests,
> and future work delivered in Phase 10.

---

## 1. Goal

Add the four observability planes the system previously lacked:

- **Metrics History** — persist realtime PSI (psutil) samples for trend analysis.
- **Health Intelligence** — a coarse, rule-based system health score.
- **Event Intelligence** — a queryable event timeline with severity/category.
- **Automation Observability** — per-rule execution history (success/fail/skip).

**Non-goals (unchanged):** Prometheus, Grafana, external databases, Redis,
Celery, Kafka, LLM/RAG analysis, auto-remediation, cloud monitoring.

---

## 2. Architecture

All storage is SQLite via SQLModel (single user/node). Changes are additive and
follow existing patterns (domain packages for models/services, routers in
`api/routes/`, idempotent `ALTER TABLE`-only migrations).

```
backend/app/
├── metrics_history/          # Phase 10 Step 1–2 (metrics persistence + query)
│   ├── models.py             #   MetricSample → metrics_samples
│   ├── schemas.py            #   MetricSampleOut / MetricsSummaryOut / ...
│   └── service.py            #   record_sample / list / cleanup / summary
├── health/                   # Phase 10 Step 3 (system health score)
│   ├── models.py             #   HealthSnapshot → health_snapshots
│   ├── schemas.py            #   HealthSummaryOut / NodeHealthOut / ...
│   ├── service.py            #   compute_summary / record_snapshot
│   └── routes.py             #   GET /api/v1/health/summary
├── automation/
│   └── models.py             #   + AutomationRun → automation_runs
└── api/routes/
    ├── metrics_history.py    #   GET /api/v1/metrics/{history,summary}
    ├── timeline.py           #   GET /api/v1/events/timeline
    └── events.py             #   SSE: + metrics_snapshot/health_update/automation_event
```

- **Sampling** (Step 1/3): the existing `_heartbeat_loop` in `main.py` collects
  metrics every heartbeat tick, persists a `metrics_samples` row + a light
  `health_snapshots` row, and prunes samples older than 30 days. The realtime
  `GET /nodes/{id}/metrics` response is unchanged.
- **Health score** is a deterministic rule-based formula (no ML):
  `100 − 30·offline_nodes − min(5·recent_errors, 30) − 5·min(stopped_containers, 4)`,
  clamped to `[0, 100]`. Docker absent/empty is neutral, not a failure.
- **Activity spine** remains the single write entry point
  (`activity_service.record`); severity is derived from the action verb
  (error/warning/info), category from the producer type.

---

## 3. Database Changes

| Change | Table | Note |
|---|---|---|
| Added | `metrics_samples` | id, node_id, timestamp(idx), cpu/memory/disk_percent, network_rx/tx, metadata(JSON) |
| Added | `health_snapshots` | id, node_id, timestamp(idx), overall_score, online, offline, error_count |
| Added | `automation_runs` | id, rule_id(idx), trigger, status, result(JSON), error, triggered_at(idx) |
| Added columns | `activities.severity` (nullable) | via idempotent `ALTER TABLE` migration |
| Added columns | `activities.category` (nullable) | via idempotent `ALTER TABLE` migration |

Retention: `metrics_samples` pruned to 30 days (`cleanup_old_samples`,
timestamp comparison — non-aggressive). All new tables are created with
`create_all()`; no destructive migration is introduced.

---

## 4. API List (new endpoints)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/metrics/history` | History (ascending); params `node_id`, `start`, `end`, `limit` (default 500, max 5000) |
| GET | `/api/v1/metrics/summary` | Aggregate; params `node_id`, `range` (`1h/6h/24h/7d`) |
| GET | `/api/v1/health/summary` | `overall_score`, `node_health`, `service_health`, `recent_errors` |
| GET | `/api/v1/events/timeline` | Timeline; params `severity`, `category`, `source`(=type), `start`, `end`, `limit` |
| GET | `/api/v1/automation/runs` | Execution history; param `limit` |

All new endpoints are gated by `require_access` (anonymous → 401, token →
200). Missing nodes → 404 with the uniform `{"error":{"code","message"}}`
envelope.

---

## 5. Frontend

- **Page:** `/observability`
- **Components** (`src/components/observability/`):
  - `MetricChart` — dependency-free SVG line chart (title, latest, avg/max).
  - `HealthScore` — score bar + node/docker/error breakdown.
  - `TimelinePanel` — reuses the Activity spine timeline.
  - `AutomationRuns` — recent rule executions (success/failed/skipped badges).
- **Hooks** (`src/hooks`): `useMetricsHistory`, `useMetricsSummary`
  (exposed as `useMetricsSummary` companion), `useHealthSummary`,
  `useEventTimeline`, `useAutomationRuns` — all built on the existing
  `useAsync` pattern (30s refresh + `silence:wake` refetch).
- **Data layer:** `types` (camelCase contracts), `lib/backend` (snake_case
  mappers + fetchers), `lib/api` (mock/seam), `mock/observability` (demo data).
- **Nav/i18n:** `/observability` added to `NAV_ITEMS` with a `LineChart` icon;
  Chinese labels added to the `zh` dictionary.

The chart decision (per the plan) is **zero-dependency SVG** — no chart library
introduced; complex charting is deferred to a future phase if ever required.

---

## 6. Realtime (SSE)

The single existing `EventSource` (Phase 4) is extended in-place — **no second
stream** is created. New events on the same `/api/v1/events` stream:

| Event | Payload | Cadence |
|---|---|---|
| `metrics_snapshot` | lightweight sample point | every metrics tick (5s) |
| `health_update` | health summary (no Docker probe) | every node-status tick (10s) |
| `automation_event` | `{rule_id, status, trigger, triggered_at, error}` | when a rule evaluates |

`RealtimeProvider` now listens for all three and exposes
`useRealtimeMetricSamples`, `useRealtimeHealthSummary`, and
`useRealtimeAutomationEvents` (plus the existing metrics/nodeStatus/connection).
The automation engine publishes its events through a second in-process
best-effort queue (`sse_service.publish_automation_event`), mirroring the
Phase 9 notification queue.

---

## 7. Tests

- **Backend** (`uv run pytest`): **142 passed** — incl. `test_metrics_history`,
  `test_metrics_history_api`, `test_health` (summary + score + snapshot),
  `test_timeline` (derivation + filters/order + endpoint + auth),
  `test_automation_runs` (success/skipped runs + endpoint + auth).
- **Frontend** (`pnpm test`): **86 passed** — incl. `metric-chart`,
  `health-card`, and `observability` (page) tests.
- **Verification:** `pnpm typecheck` clean, `pnpm build` success
  (`/observability` route emitted).

---

## 8. Future Work

- Metric-history **downsampling** for longer ranges and finer retention policy.
- Health **trends** from `health_snapshots` (currently only the live score is
  surfaced; snapshots are recorded but not yet charted).
- Timeline **correlation** (linking related events by association ids) and a
  richer severity/category taxonomy from producers.
- Automation **trigger analytics** (aggregates over `automation_runs` beyond the
  raw list) and "skipped" run volume controls.
- A dedicated sampling cadence independent of the node heartbeat interval.
- Realtime chart **live-append** (merge `metrics_snapshot` into the REST history
  buffer); today the dashboard primarily reads the REST history endpoints.
- Chart library only if a genuinely complex requirement emerges (deferred by design).