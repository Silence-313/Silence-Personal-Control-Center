# PHASE 8 — STEP 2 ADR（deltas only）

> Step 2 deliverable. Decisions only — no migration/observer/UI code.
> `docs/PHASE_8_PLAN.md` left as-is (all decisions fall within the plan's open options; no delta needed).

## ADR-1 — Research 相对路径基准（research_base）

- **决定**：新增后端配置 `research_base`（settings，默认 `None`）+ `research_observe_ttl_seconds`（默认 30）。
- 相对路径字段（`paper.pdf_path`、`report.path`）在 `research_base` 已配置时解析为 `research_base / rel`；
  解析出的规范化路径**必须仍位于 `research_base` 之内**（拒绝 `..`/越界 → `error`）。
- `research_base` 未配置 → 相对路径报告 `missing`（不报错，不猜测）。
- 注册表里的绝对路径（dataset `path`）直接观测；仅 stat/`exists` 探测，不递归、不跟随越界符号链接。
- **理由**：注册表确实含相对路径；既要让它们有意义，又绝不扫描 `/` 或 `$HOME`。

## ADR-2 — Session 持久化：轻量 SQLite 表（不扩 YAML）

- **决定**：新建 `sessions` SQLModel 表（9 列：`id, agent_id, node_id, project_id?, research_project_id?, status, started_at, ended_at?, last_activity_at, current_task?`）；
  **幂等种子**：首次初始化且表为空时，从 `agents.yaml` 的 `sessions:` 导入（按 id 去重），YAML 只做种子来源、永不被改写。
- 现有 `GET /api/v1/agents/{id}/sessions` **契约不变**（响应模型同一 `AgentSessionOut`，数据源从 YAML 改为 SQLite，仅新增可空 `research_project_id`）。
- **理由**：绝对规则 #3 禁止改写 registry → YAML 无法承载运行时/生命周期会话；Activity 事件脊柱要引用 `session_id`，Session 必须是可查询的持久面；schema 极小、无新依赖。

## ADR-3 — Activity 写入口：仅内部 service（无公开 POST）

- **决定**：**不提供公开 `POST /api/v1/activities`**。所有写入经扩展后的
  `activity_service.record(..., project_id=None, agent_id=None, session_id=None, research_project_id=None)`，
  且**只允许内部系统生产者调用**（命令生命周期[既有]、Session 生命周期、观测结果）。
- **理由**：杜绝任意字符串注入、绕过鉴权；写路径保持可控、可审计。

## ADR-4 — 观测缓存 / TTL

- **决定**：进程内内存 TTL 缓存（key = 实体类型+id），TTL = settings（默认 30s，与前端轮询对齐）；
  观测结果**含错误也缓存**（短 TTL），抖动路径不反复压测；**永不落盘**、不写 YAML。

## ADR-5 — Session 生命周期记录

- **决定**：Session 记录由 `agents.yaml` 种子提供；`session_service` 暴露**仅内部使用**的 create/transition 能力
  （供未来真实生产者调用，并有测试覆盖）；**不制造任何无真实触发源的合成生命周期事件**。
- Step 5 的关联填充只使用已知生产者（命令事件、可解析的观测结果、种子/内部创建的 Session）。

## ADR-6 — 附加 API 与 runtime 形状（最终）

**附加 REST（全部 `require_access`，成功=裸对象/列表，404 沿用 detail 文案）：**

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/sessions` | list[SessionOut] |
| GET | `/api/v1/sessions/{id}` | SessionOut（404 `Session not found`） |
| GET | `/api/v1/agents/{id}/sessions` | 既有，契约不变（数据源改为 SQLite，形状 +`research_project_id`） |
| GET | `/api/v1/research/...`（12 个既有） | 响应 **add-only** 增加可选 `runtime`（Paper/Dataset/Experiment/Report） |
| GET | `/api/v1/runtime/state` | **Step 7 再定**（可选聚合面） |

**无**：公开 POST /activities、execute/parse 类端点。

**`runtime` 形状（最终）**：

```text
runtime: {
  exists: bool,          # 路径被 stat 成功
  missing: bool,         # 无路径 / 不存在（error 时不置位）
  size_bytes?: int,      # exists 时
  modified_at?: str,     # ISO 8601，exists 时
  error?: string         # permission / base 未配置 / 越界等——短消息，绝不堆栈、绝不完整路径
}
```

- 优先级：`error` > `exists`；路径为 `None` → `{exists: false, missing: true}`。
- 前端 `stale` 徽标由 `modified_at` 在客户端派生（后端只给事实）。

**Schema 附加（add-only）**：`AgentSessionOut` + `research_project_id: str | None = None`；
6 个 Research `*Out`（Paper/Dataset/Experiment/Report）+ `runtime`。

**新增后端配置**：`research_base`、`research_observe_ttl_seconds`。

---

*End of Step 2 ADR.*