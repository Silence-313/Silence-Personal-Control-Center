# PHASE_6_PLAN.md

# Phase 6 --- Agent Control Plane

> Silence Personal Control Center · v0.1

## 1. Phase Objective

Phase 6 的目标不是开发 Coding Agent，而是建立一个真正的：

> **Agent Control Plane**

让 Personal Control Center 能够：

-   识别有哪些 Agent
-   显示 Agent 当前状态
-   显示 Agent 属于哪个 Node / Project
-   关联 Agent Session
-   关联 Activity
-   在 Dashboard 中提供 Agent 总览

核心原则：

> **Observe and organize, not execute.**

------------------------------------------------------------------------

## 2. Starting Point

Phase 5 已经完成 Project Control Plane：

``` text
Node
 │
 └── Project
       ├── Git
       ├── Health
       └── Activity (部分关联预留)
```

Phase 6 在此基础上增加：

``` text
Project
 │
 ├── Agent
 │     └── Session
 │
 └── Activity
```

Phase 6 不应破坏 Phase 3 / 4 / 5。

------------------------------------------------------------------------

## 3. Scope

### In Scope

-   Agent Registry
-   Agent domain model
-   Agent status
-   Agent capabilities metadata
-   Agent → Node association
-   Agent → Project association
-   Agent Session read model
-   Agent REST API
-   Agent frontend
-   Agent detail
-   Dashboard Agent summary
-   Activity association
-   Tests
-   iPad LAN verification
-   Documentation

### Out of Scope

-   Coding Agent implementation
-   Claude Code integration
-   Codex integration
-   DeepSeek Harness integration
-   OpenCode integration
-   Second Brain modification
-   Shell execution
-   Arbitrary command execution
-   Git write
-   Docker control
-   Robotics control
-   RL training control
-   Research execution
-   Agent spawning
-   Agent installation
-   Agent lifecycle execution

------------------------------------------------------------------------

## 4. Agent Domain Model

建议：

``` text
Agent
├── id
├── name
├── type
├── description
├── status
├── node_id
├── current_project_id?
├── current_session_id?
├── current_task?
├── last_activity_at?
├── capabilities[]
└── metadata
```

### Agent Type

第一版允许：

``` text
coding
research
robotics
data
review
general
```

### Agent Status

严格限制：

``` text
offline
idle
running
error
unknown
```

不要把：

``` text
sleeping
```

作为 Agent 状态。

Sleep 是 Node / Device 层语义。

------------------------------------------------------------------------

## 5. Agent Registry

优先复用已有 registry/configuration 模式。

例如：

``` yaml
agents:
  - id: coding-agent
    name: Coding Agent
    type: coding
    description: Coding task orchestration
    node_id: macbook-pro
    capabilities:
      - code_analysis
      - code_generation
      - testing

  - id: research-agent
    name: Research Agent
    type: research
    node_id: macbook-pro
    capabilities:
      - paper_analysis
      - literature_search
```

注意：

Registry 描述的是：

> Agent identity / metadata

不是 Agent implementation。

------------------------------------------------------------------------

## 6. Session Read Model

第一版只需要观察 Session。

建议：

``` text
AgentSession
├── id
├── agent_id
├── node_id
├── project_id?
├── status
├── started_at
├── ended_at?
├── last_activity_at
└── current_task?
```

Session 状态：

``` text
created
running
completed
failed
cancelled
```

Phase 6 不要求真正启动 Session。

------------------------------------------------------------------------

## 7. Activity Association

Phase 5 已知技术债：

> Activity 尚未正式建立 project_id 关联。

Phase 6 应开始建立：

``` text
Activity
├── agent_id?
├── session_id?
├── project_id?
├── node_id?
├── timestamp
├── type
├── title
├── description
└── status
```

必须保证旧 Activity 数据仍能正常显示。

------------------------------------------------------------------------

## 8. Backend API

建议最小 API：

``` http
GET /api/v1/agents
GET /api/v1/agents/{id}
GET /api/v1/agents/{id}/sessions
```

如果当前架构已经具备 session endpoint，也可以复用。

第一版不要增加：

``` http
POST /agents/{id}/execute
POST /agents/{id}/start
POST /agents/{id}/stop
POST /agents/{id}/spawn
```

------------------------------------------------------------------------

## 9. Frontend

Agent List：

``` text
Agents

┌─────────────────────────────┐
│ Coding Agent                │
│ ● IDLE                      │
│ Node: MacBook Pro           │
│ Project: G1                 │
│ Last activity: 2m ago      │
└─────────────────────────────┘
```

Agent Detail：

``` text
Coding Agent

Status
IDLE

Node
MacBook Pro

Current Project
G1

Current Session
None

Capabilities
Code Analysis
Code Generation
Testing

Recent Activity
...
```

------------------------------------------------------------------------

## 10. Dashboard Integration

Dashboard 增加：

``` text
Agents
────────────────────
5 Registered
1 Running
2 Idle
2 Offline
```

以及：

``` text
Recent Agent Activity
```

但避免 Dashboard 变成 Agent 专属页面。

------------------------------------------------------------------------

## 11. Realtime Strategy

优先复用 Phase 4 已有 RealtimeProvider。

不要：

``` text
AgentCard → new EventSource()
AgentCard → new EventSource()
AgentCard → new EventSource()
```

必须：

``` text
RealtimeProvider
       │
       ▼
Agent domain state
       │
       ├── AgentCard
       ├── AgentDetail
       └── Dashboard
```

如果当前 Agent 没有真实 event source：

> 第一版可以使用 REST + 合理 polling。

不要为了 Agent 强行重构 SSE。

------------------------------------------------------------------------

## 12. Mock / Real

继续保持：

``` text
UI
 ↓
api.ts
 ↓
mock | backend
```

UI 不直接：

``` text
fetch()
```

Mock 数据必须与真实 Agent domain model 对齐。

不能出现：

``` text
mock.status = "running now"
real.status = "RUNNING"
```

之类的语义漂移。

------------------------------------------------------------------------

## 13. Security

Phase 6 所有 Agent API 默认：

``` text
require_access
```

不允许：

-   token 写死
-   secret 进入 frontend
-   未授权 Agent metadata endpoint
-   新增第二套认证机制

Phase 6 为 read-only Control Plane。

因此：

> Agent API 默认 GET-only。

------------------------------------------------------------------------

## 14. Compatibility Rules

Phase 6 必须保持：

-   Node API 不回归
-   Metrics 不回归
-   Power 不回归
-   Projects 不回归
-   Git read-only
-   SSE 不回归
-   Auth 不回归
-   Mock / Real seam 不回归

任何需要修改旧契约的情况：

> 先停下来报告，不自行扩大范围。

------------------------------------------------------------------------

## 15. Implementation Steps

### Step 1 --- Audit

检查：

``` text
src/types/index.ts
src/lib/api.ts
src/lib/backend.ts
src/hooks/index.ts
src/mock/
backend/app/models/
backend/app/schemas/
backend/app/services/
backend/app/api/routes/
backend/config/
backend/tests/
src/test/
```

重点寻找已有 Agent / Activity / Project 能力。

------------------------------------------------------------------------

### Step 2 --- Architecture Decision

确定：

-   Agent Registry 存放位置
-   是否需要 DB
-   Agent 是否 node-scoped
-   Project association 如何表达
-   Session 是否 DB-backed
-   Activity association 如何兼容旧数据
-   Realtime 是否需要扩展

原则：

> 能复用现有结构就不要新增基础设施。

------------------------------------------------------------------------

### Step 3 --- Domain Model

实现：

``` text
Agent
AgentStatus
AgentCapability
AgentSession
```

------------------------------------------------------------------------

### Step 4 --- Registry

建立 Agent registry。

第一版不需要动态注册。

------------------------------------------------------------------------

### Step 5 --- Backend

实现：

``` text
GET /agents
GET /agents/{id}
GET /agents/{id}/sessions
```

所有 endpoint：

``` text
require_access
```

------------------------------------------------------------------------

### Step 6 --- Activity Association

补充：

``` text
agent_id
session_id
project_id
```

保持 backward compatible。

------------------------------------------------------------------------

### Step 7 --- Frontend

实现：

-   Agent list
-   Agent detail
-   Status
-   Project
-   Node
-   Session
-   Capabilities
-   Recent Activity

------------------------------------------------------------------------

### Step 8 --- Dashboard

加入 Agent summary。

------------------------------------------------------------------------

### Step 9 --- Testing

Backend：

-   registry
-   list
-   detail
-   404
-   auth
-   status
-   session
-   project association
-   activity association

Frontend：

-   mapper
-   list rendering
-   detail rendering
-   loading
-   error
-   stale
-   mock mode
-   real mode
-   status rendering

------------------------------------------------------------------------

### Step 10 --- iPad Validation

至少验证：

``` text
1366 × 1024
1024 × 1366
```

检查：

-   no horizontal overflow
-   touch target ≥ 44px
-   readable status
-   navigation
-   Agent detail
-   stale/offline
-   loading/error

------------------------------------------------------------------------

### Step 11 --- Regression

必须通过：

``` bash
uv run pytest
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

并记录测试数量。

------------------------------------------------------------------------

### Step 12 --- Documentation

生成：

``` text
docs/phase-6-agent-control-plane.md
```

包含：

-   Audit
-   Architecture
-   API
-   Data model
-   Files changed
-   Tests
-   Known limitations
-   Security
-   Definition of Done

------------------------------------------------------------------------

## 16. Definition of Done

Phase 6 只有全部满足才算完成：

-   [ ] Agent Registry
-   [ ] Agent domain model
-   [ ] Agent status
-   [ ] Agent capabilities
-   [ ] Node association
-   [ ] Project association
-   [ ] Session read model
-   [ ] Activity → Agent
-   [ ] Activity → Session
-   [ ] Activity → Project
-   [ ] Agent REST API
-   [ ] Agent list UI
-   [ ] Agent detail UI
-   [ ] Dashboard summary
-   [ ] Mock / Real alignment
-   [ ] Authentication preserved
-   [ ] Frontend tests
-   [ ] Backend tests
-   [ ] typecheck
-   [ ] lint
-   [ ] build
-   [ ] iPad LAN verification
-   [ ] Documentation
-   [ ] No shell execution
-   [ ] No Git write
-   [ ] No Second Brain modification
-   [ ] No Agent implementation
-   [ ] No Robotics execution
-   [ ] No Research execution

------------------------------------------------------------------------

## 17. Exit Criteria

完成后，Control Center 至少能够回答：

> 我有哪些 Agent？

> 每个 Agent 当前是什么状态？

> Agent 位于哪个 Node？

> Agent 当前关联哪个 Project？

> Agent 当前有没有 Session？

> 最近发生了什么 Agent Activity？

但不能回答：

> "现在帮我执行这个 Agent。"

因为这属于后续：

# Execution Plane

------------------------------------------------------------------------

## 18. Next Phase

Phase 6 完成后进入：

# Phase 7 --- Session & Activity Plane

进一步统一：

``` text
Agent
  ↓
Session
  ↓
Activity
  ↓
Project
  ↓
Node
```

最终为后续 Research / Robotics / Execution Plane
建立统一事件与任务基础。
