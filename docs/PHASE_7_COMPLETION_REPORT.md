# PHASE 7 COMPLETION REPORT — Research Control Plane

## 0. 结论速览（Verdict Summary）

| # | 类别 | 判定 |
|---|------|------|
| 1 | 目标达成 | PASS |
| 2 | 审计 | PASS |
| 3 | 架构决策落地 | PASS |
| 4 | 后端 Schema（6 Out） | PASS |
| 5 | 研究注册表 research.yaml | PASS |
| 6 | research_service | PASS |
| 7 | 路由（12 GET + require_access） | PASS |
| 8 | 后端测试 | PASS |
| 9 | 前端类型 | PASS |
| 10 | backend.ts mapper/fetch | PASS |
| 11 | api.ts seam | PASS |
| 12 | hooks（13 + 组合） | PASS |
| 13 | status.ts + i18n | PASS |
| 14 | mock + registry + UI | PASS |
| 15 | 前端测试 | PASS |
| 16 | 全量回归 | PASS |
| 17 | 安全 | PASS |
| 18 | 版本控制 | NOT COMMITTED（按要求不提交） |

---

## 1. 目标达成 — PASS

建立 Research Metadata READ Control Plane：新增 6 实体（ResearchProject / Paper / Dataset / Experiment / ResearchReport / ResearchNote）、12 个 GET-only 端点、动态路由 `/research/[type]` 与 `/research/[type]/[id]`、`/research` 概览（6 计数卡 + 实验状态 + 数据集可用性 + 最近活动），删除旧 `ResearchItem/ResearchType/ResearchStatus`。所有锁定架构决策均已落地。

## 2. 审计 — PASS

锁定 `ResearchItem/ResearchType/ResearchStatus` 的 7 处引用站点（types、mock、api、hooks、research/page、ResearchItemCard、status）已全部替换/删除；`docs/PHASE_7_PLAN.md` 的过期 “Session & Activity Plane” 投影已标记未采用。

## 3. 架构决策落地 — PASS

- 持久化 = `backend/config/research.yaml`，**未建 SQLite 表**（`git status` 无迁移脚本）。
- 6 实体 + 删除旧三类型：已落实。
- 仅 GET（12 端点）：已落实，无 POST/PUT/PATCH/DELETE。
- Mock/Real seam（`api.ts`）：12 个 `get*` 全部接入 `USE_MOCK`。
- 30s polling、未新增 SSE、未改 `RealtimeProvider`：已落实（组合 hook 复用 `useAsync` + `MEDIUM_REFRESH_MS`）。
- 未改 Activity schema（无 `research_project_id`）：已落实。
- 动态路由 + `RESEARCH_TYPES` 注册表：已落实（`RESEARCH_TYPE_KEYS` + `isResearchType`）。

## 4. 后端 Schema（6 Out） — PASS

`backend/app/schemas/research.py` 定义 `ResearchProjectOut / PaperOut / DatasetOut / ExperimentOut / ResearchReportOut / ResearchNoteOut`，时间字段全 `str`，status/format 为 `str`（不做 Literal 过校验）。6 实体映射经 service `build_*` 校验通过。

## 5. 研究注册表 research.yaml — PASS

`backend/config/research.yaml`：6 项目 / 8 论文 / 5 数据集 / 8 实验 / 5 报告 / 8 笔记（共 40 条），ISO 8601 `Z` 时间；实验覆盖 5 状态；`project_id` 仅在匹配真实 `projects.yaml` 时填写。服务启动读取成功（`GET /research/projects` → 200，6 项目；`/papers` → 8）。

## 6. research_service — PASS

`KEYS=(projects,papers,datasets,experiments,reports,notes)`；缺失文件 → 空 6×[] + warn；malformed YAML → `ResearchRegistryError("research registry is not valid YAML")`；`build_*/list_*/get_*`（detail 返回 `Out | None`）。

## 7. 路由（12 GET + require_access） — PASS

`backend/app/api/routes/research.py`：`prefix="/api/v1/research"` + `dependencies=[Depends(require_access)]`；12 endpoint；404 文案 “Research Project / Paper / Dataset / Experiment / Report / Note not found”。`main.py` 注册、`config.py` 增 `research_config`。

## 8. 后端测试 — PASS

`uv run pytest` → **64 passed**（Phase 6 基线的 57 + 7 研究用例）。覆盖 6 list、6 detail 字段、unknown 404、裸 client 401、空 registry、bad-YAML raise、`research_project_id` 关系一致性。

## 9. 前端类型 — PASS

`src/types/index.ts` 新增 6 实体 + `ResearchProjectStatus/PaperStatus/DatasetStatus/ResearchExperimentStatus/ResearchReportFormat/ResearchReportStatus`。研究实验状态命名 `ResearchExperimentStatus` 以避免与机器人 `ExperimentStatus`（`completed|running|failed|queued`）TS 重名冲突；`typecheck` 通过。

## 10. backend.ts mapper/fetch — PASS

`B*` raw shape + 6 `map*`（snake→camel、null→undefined）+ 12 `fetch*`（detail 404→`undefined`）。附带修复 Phase 6 遗留 `BAgent.type/status/capabilities/metadata` 与 `BAgentSession.status` 为可选，使 `agent.mappers.test.ts` 的类型断言通过（与 `mapAgent` 既有 `??` 默认值一致，无行为变化）。

## 11. api.ts seam — PASS

12 个 `get*` 全部实现 `USE_MOCK ? latency(mock) : backend.fetch*()`；移除 `getResearch`；`researchExperiments` 别名导入避免与 `@/mock/robotics` 的 `experiments` 冲突。

## 12. hooks（13 + 组合） — PASS

13 个单实体 hook + 组合 `useResearchList(type)` / `useResearchDetail(type,id)`。组合 hook 内部走单一 `useAsync` + 普通 fetcher `switch`，符合 `react-hooks/rules-of-hooks`（`pnpm lint` 无告警）。

## 13. status.ts + i18n — PASS

`researchProjectStatus/paperStatus/datasetStatus/experimentStatus/researchReportStatus`（Note 无状态）；i18n 新增实体/字段/状态标签 + `research.itemCount`；修复 `label.updated` 既有键冲突（改用 `label.updatedAt`）。

## 14. mock + registry + UI — PASS

`src/lib/research.ts`（`RESEARCH_TYPE_KEYS/ResearchTypeKey/isResearchType/RESEARCH_META/ResearchEntity/toResearchListItem/toResearchDetailFields`）；`src/mock/research.ts` 重写为 6 实体 ISO 数组；`ResearchList`/`ResearchDetail`/`icons` 组件；`/research` 概览重写；`/research/[type]`、`/research/[type]/[id]` 动态路由（非法 type → `notFound()`；`/research/[type]/[id]` 解析代码项目/研究项目/数据集名）；删除 `ResearchItemCard`。`pnpm build` 成功（三条研究路由全部生成：`/research`、`/research/[type]`、`/research/[type]/[id]`）。

## 15. 前端测试 — PASS

`pnpm test` → **65 passed**（Phase 6 基线 45 + 20 研究用例：`research.mappers.test.ts` 16 + `research-list.test.tsx` 4）。

## 16. 全量回归 — PASS

`pnpm typecheck` ✅、`pnpm lint` ✅、`pnpm build` ✅（Next.js 15.1.6，11/11 页面生成），`uv run pytest` 64 passed。

## 17. 安全 — PASS

无 `open()/subprocess/os.system/exec/eval/shell`；路径/命令仅 metadata；`research.yaml` 无凭据（token/password/key 未出现）；前端无后端密钥；匿名 → 401；无秘密日志。

## 18. 版本控制 — NOT COMMITTED

按约定 Git 只读，**未 commit / push / branch**。`git status` 含本阶段新增与修改文件，未提交到 `origin`。

---

### 关键产出（Primary Outputs）

- `backend/config/research.yaml`（40 条 demo 元数据）
- `backend/app/{schemas/research.py, services/research_service.py, api/routes/research.py}` + `backend/tests/test_research.py`
- `src/lib/research.ts`（注册表 + 纯函数 helper）
- `src/components/research/{icons.ts, ResearchList.tsx, ResearchDetail.tsx}`
- `src/app/research/{page.tsx, [type]/page.tsx, [type]/[id]/page.tsx}`
- `src/test/{research.mappers.test.ts, research-list.test.tsx}`
- `docs/phase-7-research-control-plane.md`、`docs/PHASE_7_COMPLETION_REPORT.md`（本文档）

**Git: NOT COMMITTED**