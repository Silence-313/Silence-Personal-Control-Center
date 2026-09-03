# Phase 7 — Session & Activity Plane

> Project: Silence Personal Control Center
> Version: v0.1
> Phase: 7
> Status: Planned
> Predecessor: Phase 6 — Agent Control Plane

---

## 1. Objective

Phase 7 的目标不是让 Agent 开始执行任务，而是建立完整、可持久化、可追踪的：

Agent
  ↓
Session
  ↓
Activity
  ↓
Project / Node

生命周期。

Phase 6 已经完成：

- Agent Registry
- Agent API
- Agent Detail
- Session read-model
- Activity 三关联 domain contract
- Agent / Node / Project 基本关联

但目前存在三个核心限制：

1. Session 仍然是静态 YAML read-model；
2. Activity 的 project_id / agent_id / session_id 虽已进入 schema，但数据库尚未持久化；
3. Dashboard / Agent Detail 还不能基于真实关联展示 Agent Session 的活动生命周期。

因此 Phase 7 的核心是：

> 建立 Session & Activity Plane，让系统能够回答：
> “这个 Agent 的这个 Session 做了什么？”

---

# 2. Hard Boundary

Phase 7 明确不做 Execution Plane。

禁止：

- Agent spawn
- Agent start / stop / restart
- Shell / terminal execution
- Arbitrary command execution
- Coding Agent execution
- Git write
- Docker control
- Robotics execution
- Research execution
- Second Brain 修改
- MCP execution
- Remote server command execution

允许：

- Session 生命周期数据模型
- Activity 持久化
- Activity 关联
- Read-only Session API
- Internal event recording
- Dashboard / Agent Detail 展示
- 历史活动查询
- Session 状态统计

原则：

> 建立“可观察、可追踪的生命周期”，不建立“可执行的生命周期”。

---

# 3. Current State

Phase 6 已完成：

- Agent 已从 mock 转为真实 YAML Registry；
- Agent API 为 GET-only；
- Agent Detail 已存在；
- Session 为 YAML read-model；
- Activity 已预留 project_id / agent_id / session_id；
- SQLite 尚未迁移；
- Agent status 仍来自静态 registry；
- Phase 6 backend/frontend/typecheck/lint/build 全部通过。

Phase 7 应在现有架构上增量建设。

---

# 4. Architecture Decision

## 4.1 Activity

SQLite 作为 Activity 持久化事实源。

新增：

```text
activities
├── project_id TEXT NULL
├── agent_id TEXT NULL
└── session_id TEXT NULL