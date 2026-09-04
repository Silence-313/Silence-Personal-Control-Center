# PHASE 9 COMPLETION REPORT — Knowledge & Automation Plane

## 0. 结论速览（Verdict Summary）

| # | 类别 | 判定 |
|---|------|------|
| 1 | 目标达成 | PASS |
| 2 | 自动知识索引 + 手动覆盖（决策 A） | PASS |
| 3 | SSE 内嵌通知队列（决策 B） | PASS |
| 4 | YAML 规则 + SQLite 执行状态（决策 C） | PASS |
| 5 | 轻量事件匹配（决策 D） | PASS |
| 6 | LIKE 搜索（决策 E，非 FTS5） | PASS |
| 7 | Context 聚合（`/context/{type}/{id}` + `/provider/{agent_id}`） | PASS |
| 8 | 自动化引擎（`activity.created` 实装 + 其它触发可测） | PASS |
| 9 | 前端类型 / backend.ts mapper | PASS |
| 10 | api.ts seam / hooks / nav / i18n / mock | PASS |
| 11 | 前端 UI（/knowledge + /context/[type]/[id]） | PASS |
| 12 | 后端测试 | PASS（115 = 93 + 22 新） |
| 13 | 前端测试 / typecheck / lint / build | PASS（80 = 75 + 5 新） |
| 14 | 回归（SSE 前三帧、activity 写路径、Phase 0–8 契约） | PASS |
| 15 | 安全（只读 / action 白名单 / 防递归 / 无外部依赖） | PASS |
| 16 | 版本控制 | 未提交（按要求，等待指令） |

---

## 1. 目标达成 — PASS

在 Phase 0–8 之上落地 **Knowledge & Automation Plane**：从既有注册表（projects/agents/research）+ 实况表（sessions/activities）**自动构建知识图谱** → 单实体 **Context 聚合**（只读）→ **声明式安全自动化**（YAML 规则 + SQLite 状态 + SSE 通知）。全程保持「元数据 + 上下文 only」：不执行 shell、不改代码、不接外部服务/LLM、不改动任何 Phase 0–8 契约。

架构（STEP 0 已批准）：**A** 自动索引 + 手动覆盖；**B** 内嵌 SSE 通知队列；**C** YAML 规则 + SQLite 执行状态；**D** 轻量事件匹配；**E** LIKE 搜索（无 FTS5）。无重新设计、无无关改动。

## 2. 数据模型 — PASS

新增 3 张 SQLite 表（均增量、已在 `app/models/__init__.py` 注册）：

- `knowledge_items`：`id` 采用**命名空间化**（`"paper:paper-gvhmr"`），彻底消除跨类型 id 撞车；`type`/`entity_id`/`title`/`summary`/`tags`(JSON)/`meta`(JSON, DB 列名 `metadata`)/时间戳。因 SQLAlchemy 保留属性名 `metadata`，Python 字段用 `meta`、存储列仍叫 `metadata`。
- `relations`：有向边，确定性 id `"{source}|{type}|{target}"`；`relation_type` ∈ {belongs_to, uses, generated_by, depends_on, references, derived_from}。
- `automation_rules`：只存**执行状态**（`name`/`enabled`/`last_matched_at`/`last_run_at`/`run_count`），规则本体只在 YAML。

## 3. 知识索引 + 手动覆盖 — PASS

`app/knowledge/service.py::sync` 在 `init_db()`（每次启动）幂等 upsert。来源：静态注册表 projects/agents/research（含 paper/dataset/experiment/report/note 六类）→ 实况 `SessionRecord`/`Activity` → 手动 `config/knowledge.yaml`（`items` + `relations`，可补充 `depends_on`/`derived_from` 等无自动来源的边，并覆盖自动结果）。

关系推导映射全落地：research→project `references`；paper/dataset/experiment/report/note→research `belongs_to`；experiment→dataset `uses`；agent→project `references`；session→agent `generated_by`、session→project/research `references`；activity→agent/session/project/research `references`。

## 4. Context 聚合 — PASS

`app/services/context_service.py` 复用各平面服务 + 知识关系图，**纯只读**（不写库、不加行）。`GET /api/v1/context/{type}/{id}` 返回实体本体 + 关系边 + 关联的 projects/agents/sessions/research_projects/papers/datasets/experiments/reports/notes/activities 桶；`GET /api/v1/context/provider/{agent_id}` 输出面向 agent 的精选包（当前项目 + 相关研究 + 近 20 活动 + 近 10 失败）。作用域 = 实体自身关联字段 + 关系图邻居（双向）扩张。

## 5. 自动化引擎 — PASS

`app/automation/rules.py`（Trigger/Action/Rule + `load_rules`）、`engine.py`（`matches`/`evaluate`/`on_activity_created`/`sync_state`）、`schemas`/`route`。安全收敛：

- action 白名单只允许 `create_activity`（走 Activity 脊柱）与 `notify`（走 SSE 队列）；`shell` 等在解析期即丢弃并告警。
- 唯一实装触发为 `activity.created`，挂在**写路径内部**（`activity_service.record()`）；自动化产生的 activity 用 `type="automation"` 并在触发前置短路，杜绝递归。
- `experiment.updated` / `agent.failed` / `node.offline` / `project.changed` 四类触发**可匹配、有单测，但 v1 无生产 emitter**（注册表静态、心跳无离线探测器）——报告已显式说明。

`config/automation.yaml` 内置两条演示规则：`failed-activity-alert`（activity.created=failed → notify + create_activity）、`node-offline-alert`（node.offline=offline → notify + create_activity）。

### SSE 通知队列

`sse_service` 新增 `start_notifications()`（绑定运行事件循环）/`publish_notification()`（线程安全入队，未启动时返回 False）/`drain_notifications()`（异步生成器）。`events.py::event_stream` 在每次 metrics tick 前先 drain 队列；**前三帧 yield（hello/node_status/metrics）保持不变**，Phase 4 契约与 `test_event_stream_yields` 不受影响。`notify` 尽力而为，`create_activity` 恒可靠。

## 6. 前端 — PASS

- `src/types/index.ts`：`KnowledgeItem`/`Relation`/`ContextData`/`AutomationRuleState`/`KnowledgeType`/`RelationType`。
- `src/lib/backend.ts`：`B*` 原始形状 + `mapKnowledgeItem`/`mapRelation`/`mapContext`/`mapAutomationRule` + fetchers；`src/lib/api.ts` seam + `src/mock/knowledge.ts`。
- `src/hooks/index.ts`：`useKnowledgeItems`/`useContextData`/`useAutomationRules`。
- 路由 `/knowledge`（搜索 + 类型过滤列表 + 自动化规则区）与 `/context/[type]/[id]`（聚合视图）；`src/lib/knowledge.ts`（类型/标签/关系短语/前缀剥离）、`src/components/knowledge/*`、`NAV_ITEMS` 增添 `/knowledge`、`zh` i18n 键。

## 7. 测试与验证 — PASS

| 层 | 命令 | 结果 |
|----|------|------|
| 后端 | `uv run pytest` | **115 passed**（93 基线 + 22 新：knowledge 8 / context 8 / automation 6） |
| 前端 | `pnpm test` | **80 passed**（75 基线 + 5 新：knowledge-list 3 / context-view 2） |
| 前端 | `pnpm typecheck` | 通过（0 error） |
| 前端 | `pnpm lint` | 通过（0 warning/error） |
| 前端 | `pnpm build` | 通过（含新路由 `/knowledge`、`/context/[type]/[id]`） |
| 真机 | `uvicorn` 实跑 curl | `/knowledge?type=paper`→8；`/context/project/second-brain` 解析 agents/research/sessions；404 正常；`/automation/rules`→2 规则；`/relations/research:research-g1`→11 条 belongs_to |

## 8. 关键实现说明 / 坑位

- **`metadata` 属性名被 SQLAlchemy 保留**：改用字段 `meta` + `sa_column=Column("metadata", JSON)`，API 输出字段仍为 `metadata`。
- **`record()` 二次 commit 导致会话过期**：自动化钩子内的 `commit` 会让返回的 activity 实例过期，已在 `record` 钩子后补 `session.refresh(activity)`，测试 `test_record_with_associations_returned_by_get` 回归通过。
- **SSE 前三帧契约**：drain 放在循环体内、`await sleep` 之前，首三轮 `anext` 不受队列影响。
- **`notify` 无事件循环返回 False**：`publish_notification` 在 TestClient/未启动时安全降级，引擎忽略其返回值。

## 9. 边界与后续（诚实声明）

- 知识搜索为 `LIKE` 子串（决策 E 明确不用 FTS5），规模大后再评估索引手段。
- 除 `activity.created` 外，其余 4 类触发暂无生产 emitter（注册表静态、无离线探测器）；引擎与匹配逻辑已完备可测，待后续真实事件源接入即可直接生效。
- `depends_on` / `derived_from` 无自动来源，仅能通过 `config/knowledge.yaml` 手动声明。
- 前端 `/knowledge` 列表为客户端过滤（数据量小、交互即时），后端 `q/type/tag` 参数已实现并保留给规模化使用。