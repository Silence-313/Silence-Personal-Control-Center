# Silence Personal Control Center v0.1

> **Personal Research Operating System / Personal Control Center**
>
> 将 iPad Air M4 打造成个人科研、Coding、AI Agent、Robotics
> 与数据基础设施的统一控制台。

------------------------------------------------------------------------

## 1. Project Vision

``` text
                    iPad Air M4
                         │
                         ▼
              ┌─────────────────────┐
              │ Silence Personal    │
              │ Control Center      │
              └──────────┬──────────┘
                         │
                         ▼
                  Mac / Nodes
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Projects        Agents        Research
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Personal Data
                         │
                         ▼
                      2TB SSD
```

长期目标：

> **Silence Personal Control Center → Personal Research Operating
> System**

当前目标：

> **先把 iPad Air M4 做成真正可用的 Personal Control Center v0.1。**

------------------------------------------------------------------------

# 2. Current Status

截至当前（已实现至 Phase 10）：

| Phase | 名称 | 状态 |
|---|---|---|
| Phase 0 | Environment & Capability Audit | ✅ Complete |
| Phase 1 | System Architecture | ✅ Complete |
| Phase 2 | UI / UX Prototype | ✅ Complete |
| Phase 3 | Backend + Node Foundation | ✅ Complete |
| Phase 4 | Frontend Integration + Realtime | ✅ Complete |
| Phase 5 | Projects Control Plane | ✅ Complete |
| Phase 6 | Agent Control Plane | ✅ Complete |
| Phase 7 | Research Control Plane | ✅ Complete |
| Phase 8 | Runtime & Activity (Session) Plane | ✅ Complete |
| Phase 9 | Knowledge & Automation Plane | ✅ Complete |
| Phase 10 | Observability & Intelligence Plane | ✅ Complete |
| 后续 | Execution / Security / Tailscale / PWA / Deployment | ⏳ Planned |

> 说明 1：相比早期路线图，实施顺序做了重排——Research 提前为 Phase 7，
> Session+Activity 顺延为 Phase 8，Knowledge+Automation 与 Observability 提前插入。
>
> 说明 2：Robotics 与 Data Center 目前只有前端界面 + 演示数据（详见
> `docs/USER_GUIDE.md` §9），真实后端待后续阶段接入。
>
> Phase 数量与边界允许根据实际开发情况调整。

------------------------------------------------------------------------

# 3. Architecture

当前系统采用：

``` text
iPad Safari / PWA
        │
        │ LAN / future Tailscale
        ▼
   Next.js Frontend
        │
        │ REST / SSE
        ▼
    FastAPI Backend
        │
        ▼
   Control Plane
        │
        ├── Node / Metrics / Services / Power
        ├── Projects
        ├── Agents / Sessions
        ├── Research
        ├── Knowledge / Automation
        ├── Observability
        ├── Robotics      (UI + demo data)
        └── Data Center   (UI + demo data)
        │
        ▼
      Adapters
        │
        ▼
Mac / Linux / Future Mac Studio / GPU Server
```

核心设计原则：

-   **Local-first**
-   **Control Plane 与 Execution Plane 分离**
-   **Read-only 优先**
-   **Adapter-oriented**
-   **Mock / Real seam**
-   **设备统一 Device Model**
-   **明确 offline / sleeping / stale**
-   **最小权限**
-   **不要为了 UI 而引入不必要的基础设施**

------------------------------------------------------------------------

# 4. Current Technical Stack

## Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   App Router
-   Vitest
-   React Testing Library

## Backend

-   FastAPI
-   Python
-   Pydantic
-   SQLite
-   YAML Registry

## Communication

``` text
REST
  +
SSE
```

WebSocket
不再作为第一版实时通信的默认方案；除非后续出现明确需要双向长连接的场景。

## Infrastructure

-   macOS
-   Docker Desktop
-   Git
-   SSH
-   Homebrew
-   uv / Conda
-   future Tailscale

------------------------------------------------------------------------

# 5. Phase Roadmap

> ⚠️ 本节为最早规划的逐阶段路线图（命名/顺序已被实际实施重排，权威状态见上文
> §2 表格）。Robotics 与 Data Center 目前仅前端 + 演示数据。
> 使用指南见 `docs/USER_GUIDE.md`，Phase 10 汇报见 `docs/phase-10-report.md`。

## Phase 0 --- Environment & Capability Audit

目标：

> 知道现有 Mac 能提供什么能力，并确认哪些能力可以安全复用。

审计：

-   macOS / CPU / RAM / Disk
-   Homebrew
-   Node / npm / pnpm
-   Python / uv / Conda
-   Git / SSH
-   Docker
-   Network
-   Power / Sleep / Wake
-   当前服务

输出：

``` text
docs/phase-0-environment-audit.md
```

状态：**Complete**

------------------------------------------------------------------------

## Phase 1 --- System Architecture

确定：

-   Frontend
-   Backend
-   Database
-   Network
-   Authentication
-   Storage
-   Realtime
-   Device Model
-   Adapter System
-   Deployment

核心：

``` text
iPad
 ↓
Web / PWA
 ↓
Network
 ↓
Next.js
 ↓
FastAPI
 ↓
Control Plane
 ↓
Adapters
 ↓
Nodes
```

状态：**Complete**

------------------------------------------------------------------------

## Phase 2 --- UI / UX Prototype

目标：

> 先确定 iPad 上的 Personal Control Center 应该长什么样。

主要页面：

``` text
Dashboard
Devices
Projects
Agents
Research
Robotics
Data Center
Activity
```

重点：

-   13" iPad
-   横屏优先
-   Touch
-   Dark Mode
-   信息密度
-   Command Center 风格

状态：**Complete**

------------------------------------------------------------------------

## Phase 3 --- Backend + Node Foundation

建立：

``` text
FastAPI
  │
  ├── Node
  ├── Metrics
  ├── Services
  ├── Power
  ├── Projects
  ├── Activities
  ├── Commands
  └── Events
```

实现：

-   Node Agent
-   System metrics
-   Docker read-only
-   Git read-only
-   Storage
-   Power
-   Sleep / Wake
-   Device pairing
-   Access token
-   SSE 基础设施

状态：**Complete**

------------------------------------------------------------------------

## Phase 4 --- Frontend Integration + Realtime

核心目标：

``` text
REST initial state
        +
SSE realtime
        +
Polling fallback
        +
Offline / Stale state
```

实现：

-   Real API client
-   SSE RealtimeProvider
-   Device authentication
-   Dashboard realtime
-   Sleep / Wake UI
-   Offline / stale distinction
-   Frontend test infrastructure
-   iPad LAN validation

状态：**Complete**

------------------------------------------------------------------------

## Phase 5 --- Projects Control Plane

目标：

> 将 Project 从静态展示升级为真实的只读 Project Control Plane。

当前 Project：

``` text
Project
├── node_id
├── repositoryPath
├── branch
├── remote
├── ahead
├── behind
├── head
├── workingTree
├── health
└── lastCommit
```

能力：

-   Project list
-   Project detail
-   Real Git status
-   Remote
-   Ahead / Behind
-   Full HEAD
-   Node association
-   Health aggregation
-   30s refresh
-   Mock / Real alignment

安全边界：

> Git 全程只读。

状态：**Complete**

------------------------------------------------------------------------

# 6. Phase 6 --- Agent Control Plane

## Goal

Phase 6 不负责开发 Coding Agent 本体。

它负责：

> **让 Control Center 能够认识、注册、观察和组织 Agent。**

目标模型：

``` text
Node
 │
 └── Project
       │
       ├── Agent
       │     └── Session
       │
       └── Activity
```

核心对象：

``` text
Agent
Agent Session
Activity association
Project association
```

### Agent

建议字段：

``` text
id
name
type
description
status
node_id
current_project_id
current_session_id
current_task
last_activity_at
capabilities
metadata
```

状态：

``` text
offline
idle
running
error
unknown
```

### Phase 6 必须实现

-   Agent Registry
-   Agent domain model
-   Agent REST API
-   Agent list
-   Agent detail
-   Agent status
-   Agent → Project association
-   Agent Session read model
-   Activity → Agent association
-   Activity → Session association
-   Activity → Project association
-   Dashboard Agent summary
-   Frontend / Backend tests
-   iPad validation

### Phase 6 明确禁止

-   不开发 Coding Agent
-   不修改 Second Brain
-   不执行 shell
-   不执行任意命令
-   不执行 Git write
-   不 commit / push / pull / checkout / reset
-   不启动训练
-   不控制机器人
-   不执行 Research workflow
-   不实现 Agent execution endpoint

原则：

> **Phase 6 负责"认识 Agent"，Execution Plane 才负责"驱动 Agent"。**

状态：**Complete**

------------------------------------------------------------------------

# 7. Phase 7 --- Session & Activity Plane

目标：

> 建立 Agent Session 与统一 Activity Model。

最终：

``` text
Project
   │
   ├── Agent
   │    └── Session
   │          └── Activities
   │
   └── Git
```

关注：

-   Session lifecycle
-   Activity timeline
-   Project / Agent / Node 关联
-   Dashboard activity feed
-   Realtime activity

------------------------------------------------------------------------

# 8. Phase 8 --- Research Control Plane

建立：

``` text
Research
├── Papers
├── Projects
├── Experiments
├── Datasets
├── Notes
└── Reports
```

第一阶段重点：

-   Status
-   Metadata
-   Experiments
-   Logs
-   Metrics
-   Reports

不立即实现完整 Research Agent。

------------------------------------------------------------------------

# 9. Phase 9 --- Robotics Control Plane

建立：

``` text
Robotics
├── G1
├── N2
├── GMR
├── GVHMR
├── MuJoCo
├── RL
└── Motion Dataset
```

重点：

-   Simulation status
-   Training status
-   Experiment metadata
-   Logs
-   Metrics
-   Checkpoints

不立即开放高风险机器人执行控制。

------------------------------------------------------------------------

# 10. Phase 10 --- Personal AI Data Center

接入 2TB SSD：

``` text
Personal AI Data Center
├── datasets
├── models
├── papers
├── videos
├── experiments
├── checkpoints
├── artifacts
├── agent
├── memory
└── backups
```

实现：

-   Storage overview
-   Category statistics
-   Capacity
-   File metadata
-   Data organization

之后再考虑真正的文件管理。

------------------------------------------------------------------------

# 11. Phase 11 --- Execution Plane

这是整个系统从：

> Observe

进入：

> Act

的阶段。

可能包括：

``` text
Agent execution
Docker control
Terminal / command execution
Git write operations
Research workflows
Robotics training
Simulation control
```

所有执行能力必须：

-   Authentication
-   Authorization
-   Capability based permission
-   Audit log
-   Confirmation
-   Rate limiting
-   Safe command boundary

**Execution Plane 不应提前进入 Phase 6。**

------------------------------------------------------------------------

# 12. Phase 12 --- Security Hardening

重点：

-   Authentication
-   Authorization
-   Device identity
-   Capability permissions
-   Session management
-   CORS
-   Rate limiting
-   Audit log
-   Secret handling
-   API hardening
-   Command permission

特别保护：

``` text
Sleep / Wake
Docker
Agent
Training
Robot
Git Write
Shell
```

------------------------------------------------------------------------

# 13. Phase 13 --- Remote Access / Tailscale

目标：

``` text
iPad
 ↓
Tailscale
 ↓
Mac / Mac Studio / Server
```

支持未来：

``` text
MacBook Pro
Mac Studio
Linux Server
GPU Server
Cloud GPU
```

------------------------------------------------------------------------

# 14. Phase 14 --- PWA / iPad Optimization

目标：

``` text
Safari
 ↓
Add to Home Screen
 ↓
Silence Personal Control Center
```

优化：

-   iPad viewport
-   Touch targets
-   Orientation
-   Offline shell
-   Installability
-   Battery usage
-   Background behavior
-   Reconnection

------------------------------------------------------------------------

# 15. Phase 15 --- Observability & Monitoring

统一观察：

``` text
Node
Service
Agent
Session
Research
Robotics
Data
```

建立：

-   Health
-   Metrics
-   Logs
-   Events
-   Alerts

------------------------------------------------------------------------

# 16. Phase 16 --- Full Integration / E2E

完整链路：

``` text
iPad
 ↓
Network
 ↓
Web
 ↓
FastAPI
 ↓
Control Plane
 ↓
Node
 ↓
Adapters
 ↓
Mac
```

测试：

-   Awake
-   Sleep
-   Wake
-   Offline
-   Reconnect
-   Docker failure
-   Backend failure
-   Network interruption
-   Agent offline
-   Project unavailable
-   stale data

------------------------------------------------------------------------

# 17. Phase 17 --- Deployment

目标：

``` text
一键启动
一键停止
一键更新
```

最终支持：

-   Local development
-   Local production
-   MacBook deployment
-   Future Mac Studio deployment

------------------------------------------------------------------------

# 18. Phase 18 --- Documentation

最终文档：

``` text
README.md
docs/USER_GUIDE.md
ARCHITECTURE.md
API.md
DEPLOYMENT.md
SECURITY.md
TROUBLESHOOTING.md
```

并保留：

``` text
docs/
├── phase-0-*
├── phase-1-*
├── phase-2-*
├── phase-3-*
├── phase-4-*
├── phase-5-*
├── phase-6-*
├── phase-7-*
├── phase-8-*
├── phase-9-*
└── phase-10-*
```

------------------------------------------------------------------------

# 19. Core Architectural Rules

## Rule 1 --- Local-first

第一版不依赖：

-   AWS
-   Firebase
-   Supabase
-   SaaS database

------------------------------------------------------------------------

## Rule 2 --- Control Plane ≠ Execution Plane

``` text
Control Plane
    ↓
Observe / Organize

Execution Plane
    ↓
Act
```

必须保持边界。

------------------------------------------------------------------------

## Rule 3 --- Read-only first

尤其：

``` text
Git
Docker
Research
Robotics
Data
```

先观察，再执行。

------------------------------------------------------------------------

## Rule 4 --- Do not modify existing environments blindly

任何涉及：

-   Second Brain
-   Docker
-   Python
-   Conda
-   MuJoCo
-   Robotics
-   Git
-   SSH

的操作必须先审计。

------------------------------------------------------------------------

## Rule 5 --- Do not invent state

明确区分：

``` text
ONLINE
SLEEPING
OFFLINE
STALE
UNKNOWN
```

旧数据不能冒充实时数据。

------------------------------------------------------------------------

## Rule 6 --- iPad is the Control Surface

iPad 不承担主要计算。

``` text
iPad
  ↓
Control Surface

Mac / Server
  ↓
Compute / Execution
```

------------------------------------------------------------------------

# 20. Future Hardware

当前：

``` text
iPad Air M4
MacBook Pro M3 Pro 36GB
2TB External SSD
```

未来可能增加：

``` text
Mac Studio
Linux Server
GPU Server
Cloud GPU
```

统一抽象为：

``` text
Node
```

因此增加 Mac Studio 不应该要求重构整个系统。

------------------------------------------------------------------------

# 21. Current Development Principle

每个 Phase 都遵循：

``` text
Audit
  ↓
Analyze
  ↓
Design
  ↓
Plan
  ↓
User Approval
  ↓
Implement
  ↓
Test
  ↓
Verify
  ↓
Document
  ↓
Next Phase
```

**未获得用户确认前，不进入下一阶段的实现。**

------------------------------------------------------------------------

# 22. Current Next Step

当前 **Phase 10（Observability & Intelligence Plane）已完成**。

下一步候选（按优先级）：

1. **Robotics 真实后端接入** —— 目前 `/robotics` 整页为演示数据。
2. **Data Center 真实存储接入** —— 目前 `/data-center` 整页为演示数据（2TB 数据层）。
3. **Execution Plane（执行面）** —— 命令 / Docker / Agent 驱动，需严格鉴权、能力权限与审计日志。
4. **细节打磨** —— 补齐 `docs/USER_GUIDE.md` 中标注「演示数据」的内容（机器人 / 存储 / 任务）。

详细使用见 `docs/USER_GUIDE.md`；Phase 10 汇报见 `docs/phase-10-report.md`。

------------------------------------------------------------------------

# 23. Project Philosophy

这个项目不是：

> 一个漂亮的 Dashboard。

也不是：

> 一个远程 Terminal。

最终目标是：

> **一个属于个人开发者的 Local-first Personal Research Operating
> System。**

iPad 是它的：

> **Control Surface**

Mac / Mac Studio / Server 是它的：

> **Compute & Execution Infrastructure**

Agent 是它的：

> **Cognitive / Automation Layer**

2TB SSD 是它的：

> **Personal Data Layer**

最终形成：

``` text
                    Personal Research OS
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
      Control Plane     Cognitive Layer    Data Layer
          │                 │                 │
          ▼                 ▼                 ▼
        Nodes             Agents             SSD
        Projects          Sessions           Datasets
        Research          Activities         Models
        Robotics          Workflows           Memory
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                     Execution Plane
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
           Mac           Mac Studio       Server
```
