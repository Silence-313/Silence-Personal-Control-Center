# PHASE 8 COMPLETION REPORT — Runtime & Activity Plane

## 0. 结论速览（Verdict Summary）

| # | 类别 | 判定 |
|---|------|------|
| 1 | 目标达成 | PASS |
| 2 | 基线审计（STEP1） | PASS |
| 3 | 架构决策 ADR（STEP2） | PASS（6 项 ADR 落地） |
| 4 | Activity 迁移（4 关联列） | PASS |
| 5 | Session Plane（表/服务/端点） | PASS |
| 6 | Activity 写路径（record 唯一入口） | PASS |
| 7 | Research 文件系统观测器 | PASS |
| 8 | Runtime 聚合 `/runtime/state` | PASS |
| 9 | 前端类型 / backend.ts mapper | PASS |
| 10 | api.ts seam / hooks | PASS |
| 11 | 前端 UI（Sessions / Activity 关联 / Runtime 徽标） | PASS |
| 12 | i18n / mock | PASS |
| 13 | 后端测试 | PASS（93） |
| 14 | 前端测试 / typecheck / lint / build | PASS（75） |
| 15 | 回归（轮询 / SSE / sleep:wake） | PASS |
| 16 | 安全（只读 / allow-list / 无秘密 / 无重依赖） | PASS |
| 17 | 联网真机验证（LAN/iPad） | PASS |
| 18 | 版本控制 | NOT COMMITTED（按要求不提交） |

---

## 1. 目标达成 — PASS

在 Phase 7 静态元数据平面之上，落地 **Runtime & Activity Plane**：真实文件系统观测（只读 `os.stat`）→ Session 生命周期平面 → 持久化 Activity 关联脊柱 → 聚合 `RuntimeStateOut`。全程保持 **READ-ONLY 观测，绝不执行**；`Experiment.command` 永远只展示。

## 2. 基线审计 — PASS

`docs/PHASE_8_STEP1_AUDIT.md` 完成：判定 Activity 完全无持久化、无 Session 平面、无文件观测、无 Runtime 聚合；并记录真实注册表口径（papers=8 / datasets=5 / experiments=8 / reports=5 → 观测路径 26），作为 Phase 8 起点。

## 3. 架构决策 ADR — PASS

`docs/PHASE_8_STEP2_ADR.md` 锁定 6 项决策（`research_base` 配置 + 包含性约束；Session=轻量 SQLite 表且幂等种子自 `agents.yaml`；Activity 写内部唯一、无公开 POST；观测内存 TTL 缓存 30s 不落盘；Session create/transition 内部唯一；新增 3 个只读 GET + `AgentSessionOut.research_project_id` 只增字段）。全部落地。

## 4. Activity 迁移 — PASS

`backend/app/db/migrations.py`（幂等 `migrate()`，缺列才 `ALTER TABLE`）+ `Activity` 4 个可空关联列（`project_id / agent_id / session_id / research_project_id`）；`init_db()` 在 `create_all` 后调用迁移。schema `ActivityOut` + `/activities` `_to_out` 透传 4 关联。`test_db_migration.py` 4 例全绿。实库 18 行 → 11 列（4 新列全 null，兼容存量）。

## 5. Session Plane — PASS

`SessionRecord`（`sessions` 表，9 列）+ `SessionOut`（别名自 `AgentSessionOut`）+ `session_service`（`seed_from_registry` 幂等、`list_all/get/list_by_agent`、内部 `create/transition`，状态集 `{created,running,completed,failed,cancelled}`，终态自动 `ended_at`）。端点 `GET /api/v1/sessions`、`/sessions/{id}`（404 `"Session not found"`，均 `require_access`）。`/agents/{id}/sessions` 改走 `session_service.list_by_agent`。`test_sessions.py` 8 例、`test_agents.py` 会话测试重写为真实种子 id。实库启动日志 `session plane seeded, count=3`。

## 6. Activity 写路径 — PASS

`activity_service.record(session, *, type_, action, message, …)` 是 Activity 脊柱唯一写入点：会话生命周期（create/transition）与观测变化（flip）经此写入已知关联，未知关联保持 `None`；**无公开 POST**。`test_activities.py` 4 例覆盖关联可见性、无凭证 401、POST→404/405、会话 create+transition 各产生 2 条关联活动。

## 7. Research 文件系统观测器 — PASS

`research_observer.py`：`resolve_candidate`（绝对路径原样；相对路径拼接 `research_base` + `.resolve()` + **包含性约束** `path escapes research_base`；空 → `missing`）；`_observe_uncached` 仅一次 `os.stat`（`FileNotFoundError→missing`、`PermissionError→permission denied`、其他 `OSError→类名`）；TTL 缓存 + `_previous` fl​​ip 变化队列；`drain_changes` 写 `type=research/action=observed` 活动带 `research_project_id`。`config.py` 增 `research_base`、`research_observe_ttl_seconds=30`；`RuntimeOut` 加到 Paper/Dataset/Experiment/ResearchReport 4 个 Out；8 个带路径端点 list/detail 返回前 `drain_changes`。`test_research_observer.py` 11 例（10 安全/行为 + 1 flip 活动）。

## 8. Runtime 聚合 — PASS

`schemas/runtime.py`（`ObservedPathSummary` + `RuntimeStateOut`）+ `runtime_service.py`（`observed_paths()` 覆盖 4 类路径字段；`runtime_state()` 汇总 counts/观测摘要/最近 10 条活动）+ `GET /api/v1/runtime/state`。`test_runtime.py` 2 例。实测 counts 与注册表一致、`observed_paths=26`（本机全部 `missing`）。

## 9. 前端类型 / backend.ts mapper — PASS

`ResearchRuntime` + Paper/Dataset/Experiment/ResearchReport 可选 `runtime?`；`Activity.researchProjectId?`。`backend.ts`：`BRuntime`、`mapRuntime`、`BActivity.research_project_id`、`mapActivity.researchProjectId`，4 个 research mapper 透传 `runtime`。mapper 测试补 `research_project_id` 断言。

## 10. api.ts seam / hooks — PASS

`getSessions/getSession`（Step 4）+ 现有 research/activity 造链不变；`useSessions/useSession` 复用 `useAsync`（`MEDIUM_REFRESH_MS`）。Mock/Real seam 完整。

## 11. 前端 UI — PASS

- 会话：`/sessions`（列表卡片：id/agent/状态徽标/关联 chip/currentTask）+ `/sessions/[id]`（生命周期 dl + 关联链接 + 返回）。`SessionCard` 抽出复用。
- Activity 关联：`ActivityTimeline` 渲染 `researchProjectId/projectId/agentId/sessionId` chip 链接到对应详情页。
- Research Runtime：`RuntimeBadge`（exists=success / missing=neutral / error=error / stale=warning），列表卡片 + 详情「磁盘状态」区块（size/modifiedAt + error）。
- 侧栏新增 `nav.sessions`（List 图标）。

## 12. i18n / mock — PASS

zh 增 `nav.sessions`、`sessions.*`、`research.runtimeSection/Exists/Missing/Error/Stale`、`label.agent/label.modifiedAt`（去重已有 `label.node/lastActivity`）。mock 增 5 处 `runtime`（exists/missing/stale 三态演示）。

## 13. 后端测试 — PASS

`uv run pytest` 全绿 **93 passed**。

## 14. 前端测试 / typecheck / lint / build — PASS

`pnpm test` **75 passed**（12 files，含新增 `session-card.test.tsx` 4 例、`runtime-badge.test.tsx` 5 例）；`tsc --noEmit` 干净；`next lint` 无告警；`next build` 成功（路由清单含 `/sessions`、`/sessions/[id]`）。

## 15. 回归 — PASS

30s 轮询覆盖 Sessions/Activities/Research（含 `silence:wake` 重拉 + 3s/8s 重试）；`realtime.tsx`/SSE 未动；`/nodes/macbook-pro/power`→200、SSE ticket+`/api/v1/events`→200（流保持）；420（sleep:wake 允许列表）无回归。

## 16. 安全 — PASS

只读观测（仅 `os.stat`）、allow-list 路径 + `research_base` 包含性、无 PDF 解析/OCR/Embedding/VectorDB/RAG/Research Agent/自动下载、无秘密入前端或日志、`research.yaml/projects.yaml/agents.yaml` 从未改写、无新重依赖（仅标准库）、Phase 3–7 契约（require_access / SSE ticket / sleep:wake / Mock-Real seam / 只增字段）全部保持。

## 17. 联网真机验证 — PASS

- LAN `10.101.184.21`：`/`、`/sessions`、`/research/papers`、`/activity` → 200。
- LAN `/api/v1/health` → 200；无凭证 `/api/v1/sessions` → 401（鉴权门生效）。
- localhost：`/sessions` → 3 条种子会话；`/papers` → 8 条且带 `runtime`；`/runtime/state` counts 与注册表一致、`observed_paths=26`；`/activities` → 18 条且关联字段在位（存量 null）。

## 18. 版本控制 — NOT COMMITTED

按要求不提交（`Git: NOT COMMITTED`）。

---

## 附：交付物清单

| 文件 | 类型 |
|------|------|
| `docs/PHASE_8_STEP1_AUDIT.md` | 审计（STEP1） |
| `docs/PHASE_8_STEP2_ADR.md` | 架构决策（STEP2） |
| `docs/phase-8-runtime-activity-plane.md` | 本阶段设计文档 |
| `docs/PHASE_8_COMPLETION_REPORT.md` | 本报告 |
| `backend/app/db/migrations.py` · `models/session.py` · `services/{session,research_observer,runtime}_service.py` · `schemas/{session,runtime}.py` · `api/routes/{sessions,runtime}.py` | 后端新增 |
| `backend/app/models/command.py` · `schemas/{activity,agent,research}.py` · `services/{activity,research,agent}_service.py` · `api/routes/{activities,agents,research}.py` · `core/config.py` · `db/database.py` · `main.py` | 后端改动 |
| `backend/tests/{test_db_migration,test_sessions,test_activities,test_research_observer,test_runtime}.py` + `test_agents.py` | 后端测试 |
| `src/types/index.ts` · `src/lib/{backend,nav,research,i18n,status,format}.ts` · `src/mock/research.ts` | 前端基础 |
| `src/components/{session/SessionCard,research/RuntimeBadge}.tsx` · `ResearchList/ResearchDetail/ActivityTimeline` · `src/app/sessions/{page,[id]/page}.tsx` | 前端 UI |
| `src/test/{session-card,runtime-badge,agent.mappers}.test.tsx` | 前端测试 |