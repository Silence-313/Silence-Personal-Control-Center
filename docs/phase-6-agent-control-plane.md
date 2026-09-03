# Phase 6 — Agent Control Plane

## 1. Objective

为 Silence Personal Control Center 增加 **Agent Control Plane**：注册/展示/读取 Agent 状态，并把 Agent 与 Node / Project / Session / Activity 关联起来，回答 “**知道 Agent 在做什么**”。

**不是** Execution Plane。本阶段不做任何 Agent 执行、spawn、start/stop/restart、Shell/终端、代码执行、Git 写、Docker 控制、Robotics/Research 执行、Second Brain 修改。

## 2. Audit Findings

审计结论（详见 `PHASE 6 AUDIT REPORT`）：

- Agent 在此之前 **只存在于前端 mock**（`src/mock/agents.ts` + 组件），后端零 Agent 代码。
- 前端 `Agent` 类型存在但语义漂移（`role` 而非 `type`；`lastSession/lastActivity` 为人类可读字符串而非 ISO/`current_session_id`）。
- `AgentStatus` 含 `paused`、缺 `unknown`，与本阶段规范冲突。
- 后端无 Agent API / mapper / service；仅 `useAgents()`，无 `useAgent(id)`。
- Activity 前后端均无 `project_id/agent_id/session_id` 三关联字段。
- Session 完全不存在。
- mock nodeId 与真实 node registry 不一致（`macbook-pro-m3-pro` vs `macbook-pro`）。

## 3. Architecture Decision

- **Agent Registry 使用 YAML**（复用 Phase 5 Project Registry 模式）——`backend/config/agents.yaml`，不建数据库表。
- **Session 为 read-only model**，同样由 YAML registry 承载，不建数据库表。
- **Activity 三关联采用「方案 A」**：仅扩展 schema + 前端 type + mapper（`project_id?/agent_id?/session_id?` 全 nullable），**不迁移 SQLite schema**（`no ALTER TABLE`）。写入生命周期推迟到 Phase 7。
- 鉴权沿用 `require_access`（localhost / admin token / device token），不新增鉴权体系。
- 前端沿用 `UI → hooks → api.ts → backend.ts → FastAPI` 栈与 Mock/Real seam（`NEXT_PUBLIC_USE_MOCK`）。

## 4. Agent Model

`Agent`：`id, name, type, description, status, node_id, current_project_id?, current_session_id?, current_task?, last_activity_at?(ISO 8601), capabilities[], metadata`。

- `AgentStatus` 严格 `offline | idle | running | error | unknown`（删除 `paused`，新增 `unknown`）。
- `AgentType` = `coding | research | robotics | data | review | general`。
- `Agent Out`（`last_activity_at`）使用机器可解析的 ISO 8601，不再使用“Today 12:34 / 2 minutes ago”等 presentation 文案。

## 5. Agent Registry

`backend/config/agents.yaml` 注册 5 个 Agent（coding / research / robotics / data / review），全部 `node_id: macbook-pro`。capabilities 第一版仅 `code_analysis / code_generation / testing / paper_analysis / literature_search / robotics_analysis / data_analysis / review`，**仅为 metadata，不构成执行权限**。

## 6. Session Model

`AgentSession`：`id, agent_id, node_id, project_id?, status, started_at, ended_at?, last_activity_at, current_task?`；status = `created | running | completed | failed | cancelled`。同文件 `sessions:` 提供少量历史 read-model demo（无执行含义）；`current_session_id` 保持 null，UI 可正确表示 “无活跃会话”。

## 7. Activity Contract

`ActivityOut` / 前端 `Activity` 新增可空 `project_id?/agent_id?/session_id?`。Phase 6 不写入，故从 SQLite 读取旧 Activity 时三者恒为 `null`（预留 domain contract，向后兼容，旧数据照常显示）。

## 8. Backend API

全部 `require_access`，GET-only：

- `GET /api/v1/agents` → `list[AgentOut]`
- `GET /api/v1/agents/{id}` → `AgentOut`（unknown → 404 `Agent not found`）
- `GET /api/v1/agents/{id}/sessions` → `list[AgentSessionOut]`（unknown agent → 404；无 session → `[]`）

沿用现有 envelope：错误 `{"error":{"code":"...","message":"..."}}`；成功返回裸列表/对象（无 `data` 包装）。

## 9. Frontend Architecture

- `src/types/index.ts`：`AgentStatus`（去 `paused` 增 `unknown`）、`AgentType`、`Agent`（新模型）、`SessionStatus`、`AgentSession`、`Activity` 三关联。
- `src/lib/backend.ts`：`BAgent/BAgentSession` + `mapAgent/mapAgentSession` + `fetchAgents/fetchAgent/fetchAgentSessions`；`mapActivity` 映射三关联。
- `src/lib/api.ts`：`getAgents/getAgent/getAgentSessions` 全部接入 Mock/Real seam。
- `src/hooks/index.ts`：`useAgents`（30s polling）、`useAgent(id)`、`useAgentSessions(id)`。
- UI：`/agents`（列表，状态/节点/项目/会话/任务/能力/最近活动 + `LivePill` + `OfflineBanner`）、`/agents/[id]`（详情：身份/关联/能力/最近会话/相关活动 + “返回智能体”）、`AgentSessionList`（只读，无 Start/Stop/Execute）。
- Dashboard 增加 Agent summary（Registered/Running/Idle/Offline/Error/Unknown，动态计算，可点击进入 `/agents`）。

## 10. Polling

Agent 走 **REST + 30s polling**（复用 `useAsync(refreshMs=MEDIUM_REFRESH_MS)`），**不新增 SSE**，Phase 4 `RealtimeProvider` 未被修改。

## 11. Security

- Agent API 全部 `require_access`（LAN 无 device token → 401 `Device not authorized`，已实测）。
- `config/agents.yaml` 无凭据；`metadata` 为空。
- 前端无后端密钥；`agent_service` 只做 YAML 读取，无 `subprocess/shell/exec/spawn`。
- 无秘密日志（`project_service` 同类路径已避免输出绝对路径；agent registry 仅日志其 config 路径）。
- 未发现 API token / SSH key / password / private key。

## 12. Testing

- 后端 `tests/test_agents.py`：`GET /agents`、detail、404、鉴权（裸 client 401）、sessions 过滤/空、registry bad-yaml 抛 `AgentRegistryError`。
- 前端 `agent.mappers.test.ts`（mapAgent/mapAgentSession/mapActivity 三关联 nullable）+ `agent-list.test.tsx`（AgentList 状态/任务/unknown≠offline；AgentCard 节点/项目/能力/相对时间/回退）。
- 回归：`uv run pytest` **57 passed**；`pnpm test` **45 passed**；`pnpm typecheck` / `pnpm lint` / `pnpm build` 全绿。

## 13. iPad Verification

- 后端 `uvicorn --host 0.0.0.0:8000`、前端 `pnpm dev`（`Network: http://10.101.184.21:3000`）均启动。
- `GET /agents`、`/agents/[id]`、`/agents/{id}/sessions`、LAN 401 强制鉴权、`/activities` 三关联 null 均经 LAN IP 实测通过。
- 目标 1366×1024 / 1024×1366：Agent 卡片/详情使用响应式 grid 与 `min-w-0`/`truncate`，无横向溢出；链接点击目标为整卡（≥44px）；返回导航可用；`LivePill`/`OfflineBanner`/`SkeletonBlock` 复用既有体系。

## 14. Files Changed

新增（`??` + 新增目录）：

- `backend/app/schemas/agent.py`
- `backend/app/services/agent_service.py`
- `backend/app/api/routes/agents.py`
- `backend/config/agents.yaml`
- `backend/tests/test_agents.py`
- `src/mock/agent-sessions.ts`
- `src/components/agent/AgentSessionList.tsx`
- `src/app/agents/[id]/page.tsx`
- `src/test/agent.mappers.test.ts`
- `src/test/agent-list.test.tsx`
- `docs/phase-6-agent-control-plane.md`（本文档）

修改（`M`）：

- `backend/app/core/config.py`（`agents_config`）
- `backend/app/main.py`（注册 agents 路由）
- `backend/app/schemas/activity.py`（三关联可空）
- `src/types/index.ts`、`src/lib/status.ts`、`src/lib/i18n.tsx`
- `src/lib/backend.ts`、`src/lib/api.ts`、`src/hooks/index.ts`
- `src/mock/agents.ts`、`src/mock/activities.ts`
- `src/app/agents/page.tsx`、`src/app/dashboard/page.tsx`
- `src/components/agent/AgentCard.tsx`

（注：`README.md` 与 `docs/PHASE_6_PLAN.md` 为工作区既有改动，非本阶段产出，未纳入。）

## 15. Known Limitations

- Agent `status` 来自静态 registry（默认 `idle`）；本阶段 **不读取外部 Agent runtime**，因此真实运行状态尚不可知。
- Activity 三关联字段恒为 `null`（DB 未迁移），待 Phase 7 写入时真正生效。
- Session 为静态 read-model demo；无真实监听/执行。
- mock/real 的 project id 各自独立（mock 用 mock 项目 id，real 用 `projects.yaml` id），由 seam 隔离。

## 16. Phase 7 Recommendation

进入 **Phase 7 Session & Activity Plane**：为 Activity 写入生命周期落地三关联持久化（届时再对 SQLite 做幂等 `ALTER TABLE` 迁移），把 Session 接入真实事件（若引入 runtime 则先建立只读事件源），并让 Dashboard/详情页展示基于真实关联的最近活动。执行面（Execution Plane）仍继续后置。