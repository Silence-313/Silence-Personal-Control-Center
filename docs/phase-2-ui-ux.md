# Silence Personal Control Center

## Phase 2 — UI / UX Prototype

**Project:** Silence Personal Control Center
**Version:** v0.1
**Phase:** Phase 2
**Status:** ✅ Complete (prototype)
**Date:** 2026-09-02
**Stack:** React 19 · Next.js 15 (App Router) · TypeScript 5.7 · Tailwind CSS 3.4

---

# 1. Phase 2 Objective

Phase 2 does not build a backend or an admin dashboard. Its goal is to
establish the **first usable human-machine interface** for the Personal
Control Center on the primary client (iPad Air 13" M4):

> Open the iPad → land in the Control Center → see the entire personal
> compute environment's state in one glance → quickly navigate into
> Projects / Agents / Research / Robotics / Data → and be ready for real
> control once the backend lands.

Everything runs on **mock data only**. The UI is data-contract-compatible
with the Phase 1 architecture so Phase 3 can swap data sources without
rewriting the interface.

### In scope

- 8 pages (Dashboard, Node Detail, Projects, Agents, Activity, Research, Robotics, Data Center)
- Unified design system (tokens, status system, typography, icons)
- iPad-first responsive layout (1366×1024 landscape priority)
- Mock data layer separated from UI (`mock/` → `hooks/` → components)
- TypeScript domain types + a documented API boundary (`lib/api.ts`)
- Minimal PWA (manifest, icons, pass-through service worker)
- Mock-only actions (e.g. Sleep queues a command — nothing is executed)

### Out of scope (deferred to later phases)

- FastAPI backend, Node Agent, Docker/SSH/Tailscale control
- Any real system command (`pmset`, `docker stop`, `shutdown`, …)
- Second Brain integration (shown as a mock project only)
- Real file / storage scanning

---

# 2. UI Architecture

```
src/
├── app/                 # Next.js App Router routes (1 page per section)
│   ├── layout.tsx       # root layout, metadata, PWA viewport
│   ├── page.tsx         # redirect / → /dashboard
│   ├── globals.css      # design tokens + base styles
│   ├── dashboard/       # Dashboard
│   ├── nodes/[id]/      # Node Detail
│   ├── projects/ agents/ research/ robotics/ data-center/ activity/
├── components/
│   ├── layout/          # AppShell (main scroll region + responsive frame)
│   ├── navigation/      # Sidebar, BottomTabs, node presence, DEMO badge
│   ├── ui/              # primitives: Card, Button, StatusBadge, ProgressBar…
│   ├── node/ project/ agent/ service/ activity/ research/ robotics/
│   ├── storage/ task/   # feature components
│   └── pwa/             # service worker registration
├── hooks/               # data hooks (useNodes, useProjects, …)
├── lib/
│   ├── api.ts           # API boundary (mock now, fetch later)
│   ├── status.ts        # status → tone mapping (single source of truth)
│   ├── nav.ts           # navigation config
│   ├── format.ts        # GB / clock / pct formatting
│   └── utils.ts         # cn()
├── mock/                # static mock data (1 module per domain)
└── types/               # shared domain types (Phase 3 data contract)
```

Data flow is unidirectional and strict:

```
mock/  →  lib/api.ts  →  hooks/  →  page  →  components
 (Phase 3:  HTTP  →  same api.ts signatures)
```

Components never import `mock/` directly. Pages never read raw data; they
call hooks, which call the API boundary, which currently resolves mock data
and will later `fetch()` FastAPI endpoints with identical signatures.

---

# 3. Navigation

Two touch-first patterns, chosen by viewport:

- **iPad / desktop (`lg` ≥ 1024px)** — persistent left **Sidebar rail**
  (224px) with icon + label items (48px touch targets), brand block, a
  `DEMO DATA` badge, and a live primary-node presence card linking to Node
  Detail. This reads as Mission Control rather than a generic admin sidebar.
- **Phone / narrow portrait (`< lg`)** — iOS-style **bottom tab bar**
  (7 tabs, 64px touch targets) with an auto-scrolling main region.

Sections: Dashboard, Projects, Agents, Research, Robotics, Data Center,
Activity. Node Detail is reachable by tapping the node card (sidebar footer
or dashboard node card) — a deliberate "drill-down" rather than a top-level
tab, matching Phase 1's `Node Registry` direction.

Active state uses `usePathname()` + prefix matching; each nav element uses
`aria-current="page"` and semantic `<nav>`/`<Link>`.

## 3.1 一键汉化 (i18n / Language switch)

A one-tap language toggle (sidebar footer on iPad/desktop, top bar on phone)
switches the entire UI between **English (default)** and **中文**, persisting
the choice to `localStorage` so it survives reloads.

- `src/lib/i18n.tsx` — `I18nProvider` + `useI18n().t(key, fallback, vars?)`
  with a Chinese dictionary; English stays the in-code source of truth.
- All **UI chrome** is localized: navigation labels, page titles/descriptions,
  section headings, metric/field labels, status labels (在线 / 运行中 / 空闲 …),
  activity-source labels, research types, storage categories, and the Power
  card. Status labels reuse the `status.<value>` keys already produced by
  `lib/status.ts`.
- **Business/data content is intentionally not translated** (project names,
  log messages, paper titles, descriptions come from `mock/` / the future
  backend and reflect whatever language the data is in).

---

# 4. Design System

Defined once in `src/app/globals.css` (CSS custom properties) and mapped in
`tailwind.config.ts`. Components reference semantic tokens only — no raw hex
is scattered through components.

### 4.1 Color tokens (dark-first)

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#0a0c0e` | app canvas |
| `--surface` / `-2` / `-3` | `#111417` / `#171b1f` / `#1d2227` | cards, hover, nested |
| `--border-soft` / `-strong` | `#242a31` / `#313944` | hairline borders |
| `--text-primary/secondary/muted` | `#e7eaee` / `#a6adb7` / `#6b737c` | typographic hierarchy |
| `--accent` / `-dim` | `#59b7ff` / `#1b3d57` | focus, active nav, links |
| `--success/warning/error/info` | `#3fb950` / `#d29922` / `#f85149` / `#58a6ff` | status + data-viz |

### 4.2 Status system

`lib/status.ts` is the single source of truth. Every statusful entity maps
to one of five semantic **tones**:

| Tone | Meaning |
| --- | --- |
| `success` | online / ready / healthy / clean / completed |
| `info` | actively computing (running task, training, in-progress) |
| `warning` | modified / degraded / paused / draft / attention |
| `error` | offline / failed / behind / critical |
| `neutral` | idle / stopped / archived / unknown |

Components consume the tone (`StatusDot`, `StatusBadge`, `ProgressBar`,
`Sparkline`), never raw status strings, so the whole app speaks one visual
language. "Running" states pulse subtly; there are no persistent/looping
decorative animations.

### 4.3 Typography

- UI: Apple system stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", …`)
- Metrics / mono: `ui-monospace, SFMono-Regular, Menlo, …`
- Tabular numerals for all numbers; clear size ramp (11–30px) with uppercase
  micro-labels for section/scard headings.

### 4.4 Icons

`lucide-react` exclusively. No emoji as UI icons. Icons are decorative
(`aria-hidden`) with labelled text alongside.

### 4.5 Motion

Restrained: a single page-level `fade-in`, status-dot `pulse`, and
progress-bar `width` transition. No gradients, no glassmorphism, no hero
sections. Density + clarity over decoration.

---

# 5. Component Architecture

Primitives (`components/ui`) are stateless and composable. Feature
components are **presentational and data-driven** — they receive data via
props and never fetch it:

| Feature | Components |
| --- | --- |
| node | `NodeStatusCard`, `MetricCard`, `PowerCard` |
| project | `ProjectCard`, `ProjectList` |
| agent | `AgentCard`, `AgentList` |
| service | `DockerStatusCard`, `ServiceList` |
| activity | `ActivityTimeline` |
| research | `ResearchItemCard` |
| robotics | `RobotCard`, `TrainingRunRow` |
| storage | `StorageOverview` |
| task | `TaskList` |

The only stateful (client) logic lives in pages, hooks, and a handful of
marked components (PowerCard's mock command, Research filter). No global
state library is used — plain React state + hooks suffice, per the Phase 2
"no speculative dependencies" rule.

---

# 6. Mock Data Architecture

`src/mock/` holds one module per domain, shaped exactly like the Phase 3 API
will return:

```
nodes.ts projects.ts agents.ts services.ts activities.ts
research.ts robotics.ts storage.ts metrics.ts tasks.ts
```

Values are grounded in the Phase 0 audit (M3 Pro / 36 GB / macOS 15.7.3,
the discovered Docker containers with `searxng` running, existing projects
Second Brain / MechDance / GMR / GVHMR) so the prototype is *believable*
without claiming to be live. Every surface carries a `DEMO DATA` badge, and
the dev console logs mock commands as `[demo]` rather than pretending to
execute them.

---

# 7. Responsive Strategy

Priority: **iPad landscape → iPad portrait → desktop → phone.**

- Fluid 12-column grid; content wrapped to `max-w-[1240px]`.
- Sidebar appears at `lg (≥1024px)`; bottom tabs below that.
- Cards reflow `1 → 2 → 3/4` columns across breakpoints — **no data tables**
  with horizontal scroll on iPad; all lists are card/row based.
- Touch targets ≥ 44px for primary controls; `touch-action: manipulation`
  and 16px controls to suppress iOS tap zoom.

### Verified viewports (headless Chrome)

| Viewport | Result |
| --- | --- |
| 1366×1024 (iPad 13" landscape) | ✅ no horizontal overflow |
| 1024×1366 (iPad 13" portrait) | ✅ no horizontal overflow |
| 1440×900 (desktop) | ✅ |
| 1920×1080 (desktop) | ✅ |

---

# 8. PWA Strategy

Minimal, Phase-2-scope PWA:

- `public/manifest.webmanifest` — `display: standalone`, theme/background
  `#0a0c0e`, iOS-friendly `appleWebApp` + `apple-touch-icon.png`.
- Icons generated by `scripts/generate-icons.py` (192 / 512 / 180, no
  third-party deps).
- `public/sw.js` is a **pass-through** service worker registered in
  production only — installability without any offline synchronization,
  which is deferred alongside the backend.

---

# 9. Accessibility

- Semantic landmarks: `<nav>`, `<main>`, `<header>`, lists; buttons are
  real `<button>`; links are real `<Link>`.
- `aria-current`, `aria-pressed` (filters), `aria-label`s on icon buttons,
  `role="status"` on the mock command result.
- Visible focus ring via `:focus-visible`.
- High-contrast text against the dark palette (primary `#e7eaee` on
  `#0a0c0e`).
- `prefers`-respecting system fonts and tabular numerals for readability.

---

# 10. Testing & Validation

| Check | Command | Result |
| --- | --- | --- |
| Build | `pnpm build` | ✅ PASS (11 routes) |
| TypeScript | `pnpm typecheck` | ✅ PASS |
| Lint | `pnpm lint` | ✅ PASS (0 warnings/errors) |
| Routes | headless HTTP | ✅ 8/8 → 200 |
| Console/page errors | headless Chrome, all routes | ✅ 0 errors |
| Content render | headless Chrome DOM assert | ✅ all pages populated |
| Interactions | Sleep mock · Research filter | ✅ both behave correctly |

---

# 11. Known Issues

1. Mock latency is a fixed 80ms; no loading skeleton for the sidebar node
   presence (it appears after hydration).
2. Research "experiment" and Robotics "experiment" are separate, parallel
   concepts — reconciled only when the backend event/command system exists.
3. The PWA service worker is pass-through only; offline behavior is
   intentionally not implemented.
4. `next.config.mjs` has no image domains (no remote images are used).
5. Future nodes (Mac Studio, GPU Server) are rendered `offline` as planned
   placeholders to exercise multi-node UI.

---

# 12. Phase 3 Handoff — Backend API Requirements

The frontend expects these REST endpoints (Phase 1 §19 + the surfaces the UI
now consumes). Response bodies must map to `src/types/index.ts`.

### Required

```
GET /nodes                      → Node[]
GET /nodes/{id}                 → Node

GET /metrics                    → SystemMetrics   // cpu / memory / storage / network / temp

GET /projects                   → Project[]
GET /projects/{id}              → Project

GET /agents                     → Agent[]
GET /agents/{id}                → Agent

GET /services                   → Service[]       // docker + process + launchd + application
GET /services/{id}              → Service

GET /activities                 → Activity[]      // event timeline (ISO timestamps)

GET /research                   → ResearchItem[]
GET /robots                     → Robot[]
GET /training-runs              → TrainingRun[]
GET /robotics-experiments       → RoboticsExperiment[]
GET /storage                    → StorageOverview
GET /tasks                      → Task[]          // aggregate "current tasks"

POST /commands                  → Command         // {nodeId, target, action, parameters}
```

### Realtime (later)

```
SSE   /events                   → Activity stream (drives the timeline live)
SSE   /metrics/stream           → SystemMetrics updates (sparklines + cards)
```

### Data-contract notes

- `CommandStatus` = `queued | running | completed | failed | rejected`.
- Sleep must remain a `POST /commands` with `target: "power", action: "sleep"`
  (mock-only today — no macOS execution).
- Status enums in `types/index.ts` (e.g. `NodeStatus`, `AgentStatus`) are the
  canonical string set the backend should serialize.

---

# 13. How to run

```bash
pnpm install
pnpm dev        # http://localhost:3000
# or
pnpm build && pnpm start
pnpm typecheck
pnpm lint
python3 scripts/generate-icons.py   # regenerate PWA icons
```

Set the device toolbar to **1366×1024** (iPad Air 13" landscape) in the
browser emulator for the primary experience.