# Phase 7 — Research Control Plane

## 1. Objective

为 Silence Personal Control Center 增加 **Research Control Plane（研究控制面）**：以本地统一的 **Research Metadata READ Control Plane** 展示论文、研究项目、数据集、实验、报告、笔记六类实体的元数据，回答 “**在研究什么 / 研究到哪一步**”。

**不是** Research Execution Plane。本阶段不做研究 agent、RAG、embedding、向量库、PDF 解析、数据集/2TB 扫描、命令执行、论文抓取或 Second Brain 写入；`command`/`path`/`pdf_path` 等字段仅为 metadata 展示字符串。

## 2. Audit Findings

- 研究此前 **只存在于前端 mock**（`ResearchItem` + `ResearchType`/`ResearchStatus` 单一时序模型），后端零研究代码，无任何研究路由/service/schema。
- `ResearchStatus` 为单一 `active|draft|completed|archived`，无法表达 Paper 的 `unread|reading|read|archived`、Experiment 的 `planned|running|completed|failed|cancelled`、Dataset 的 `available|missing|archived` 等分实体语义。
- 前端路由仅 `/research`（filter 式单页），无 `/research/[type]` 与 `/research/[type]/[id]` 动态路由。
- 无 mapper / service / api seam；`useResearch()` 直接返回 mock。
- mock 数据 `updatedAt` 为人类可读文案，违反 ISO 8601 机器可读约定。
- `docs/PHASE_7_PLAN.md` 为早期 “Session & Activity Plane” 投影（过期，未采用）。

## 3. Architecture Decision

- **Research scope = Research Metadata READ Control Plane**（只读元数据），不建 `research_project` 等任何 SQLite 表。
- **持久化 = `backend/config/research.yaml`**（复用 Phase 5/6 Registry 模式），零 DB 迁移。
- **6 实体**：`ResearchProject / Paper / Dataset / Experiment / ResearchReport / ResearchNote`，删除旧 `ResearchItem / ResearchType / ResearchStatus`。
- **仅 GET**：12 个 GET endpoint，`require_access` 强制鉴权；无 POST/PUT/PATCH/DELETE。
- 前端复用 `UI → hooks → api.ts → backend.ts → FastAPI` 栈与 Mock/Real seam（`NEXT_PUBLIC_USE_MOCK`）。
- **30s polling**（复用 `useAsync(refreshMs=MEDIUM_REFRESH_MS)`），**不新增 SSE、不改 RealtimeProvider**。
- **不改 Activity schema**（不加 `research_project_id`）；关联经实体自身 `project_id?`（→ Phase 5 代码项目）与跨实体 `research_project_id`（→ 研究项目）解析。
- **动态路由**：`/research/[type]` + `/research/[type]/[id]`，`RESEARCH_TYPE_KEYS` 注册表 + `isResearchType()` 校验（非法 type → `notFound()`）。

## 4. Research Model

六实体（前端 `src/types/index.ts`，后端 `backend/app/schemas/research.py`），时间字段全部 ISO 8601 字符串：

- `ResearchProject`：`id,name,description,status,created_at,updated_at,project_id?,repository_path?,tags[],metadata{}`；status=`active|paused|completed|archived`。
- `Paper`：`id,title,authors[],year?,venue?,doi?,url?,pdf_path?,status,tags[],notes?,research_project_id?,created_at,updated_at`；status=`unread|reading|read|archived`。
- `Dataset`：`…path?,size_bytes?,format?,source?,version?,status,research_project_id?,…`；status=`available|missing|archived`。
- `Experiment`：`…status,started_at?,ended_at?,dataset_id?,command?,result?,metrics?,artifact_path?,…`；status=`planned|running|completed|failed|cancelled`。
- `ResearchReport`：`…path?,format,research_project_id?,status,…`；format=`markdown|pdf|html|other`，status=`draft|completed|archived`。
- `ResearchNote`：`…content?,research_project_id?,tags[],…`；无 status。

> 注意：机器人侧已有 `ExperimentStatus`（`completed|running|failed|queued`）。研究实验状态类型已命名为 **`ResearchExperimentStatus`** 以避免 TS 重名冲突。

## 5. Research Registry

`backend/config/research.yaml` 注册 6 研究项目、8 论文、5 数据集、8 实验、5 报告、8 笔记（共 40 条）。实验覆盖 `planned/running/completed/failed/cancelled` 五种状态；`metadata: {demo: true}`；`command`/`path`/`pdf_path` 为不透明字符串；`project_id` 仅在匹配真实 `projects.yaml` id 时填写（`obsidian-plugin`/`second-brain`/`coding-video`），否则 `null`。

## 6. Backend API

`GET` 系列（全部 `require_access`）：

- `GET /api/v1/research/projects` → `list[ResearchProjectOut]`
- `GET /api/v1/research/projects/{id}` → `ResearchProjectOut`（unknown → 404 `Research Project not found`）
- `GET /api/v1/research/papers` / `papers/{id}`（404 `Paper not found`）
- `GET /api/v1/research/datasets` / `datasets/{id}`（404 `Dataset not found`）
- `GET /api/v1/research/experiments` / `experiments/{id}`（404 `Experiment not found`）
- `GET /api/v1/research/reports` / `reports/{id}`（404 `Report not found`）
- `GET /api/v1/research/notes` / `notes/{id}`（404 `Note not found`）

沿用现有 envelope：错误 `{"error":{"code","message"}}`；成功返回裸列表/对象（无 `data` 包装）；unknown → 404。

实现：`backend/app/services/research_service.py`（`load_registry()` 缺失文件→空 6×[] + warn；malformed YAML → 抛 `ResearchRegistryError("research registry is not valid YAML")`；6 `build_*`/`list_*`/`get_*`）；`backend/app/api/routes/research.py`（`APIRouter(prefix="/api/v1/research", dependencies=[Depends(require_access)])`）；`config.py` 增 `research_config`；`main.py` 注册路由。

## 7. Frontend Architecture

- `src/types/index.ts`：6 实体 + 5 研究状态/格式类型（见 §4）。
- `src/lib/backend.ts`：`B*` raw shape + `mapResearchProject/mapPaper/mapDataset/mapExperiment/mapResearchReport/mapResearchNote` + 12 `fetch*`（detail 404 → `undefined`）。
- `src/lib/api.ts`：12 个 `get*` 全部接入 Mock/Real seam（`USE_MOCK`）。
- `src/hooks/index.ts`：`useResearchProjects/useResearchProject/usePapers/usePaper/useDatasets/useDataset/useExperiments/useExperiment/useResearchReports/useResearchReport/useResearchNotes/useResearchNote`（13 个）+ 组合 `useResearchList(type)` / `useResearchDetail(type,id)`（内部走单一 `useAsync` + switch 于普通 fetcher，符合 rules-of-hooks）。
- `src/lib/research.ts`：`RESEARCH_TYPE_KEYS / ResearchTypeKey / isResearchType / RESEARCH_META / ResearchEntity / toResearchListItem / toResearchDetailFields`（纯函数，可单测）。
- `src/mock/research.ts`：重写为 6 实体数组，ISO 8601，字段与后端契约一致。
- `src/lib/status.ts`：`researchProjectStatus/paperStatus/datasetStatus/experimentStatus/researchReportStatus`（Note 无状态）。
- `src/lib/i18n.tsx`：新增研究实体/字段/状态标签。

## 8. Dynamic Routing & UI

- `src/components/research/icons.ts`：`RESEARCH_ICONS`（6 类型图标）。
- `src/components/research/ResearchList.tsx`：列表卡片（图标 + 标题 + 状态徽标 + 副标题 + tags + 相对时间），整卡 `Link` 到详情。
- `src/components/research/ResearchDetail.tsx`：详情（标题 + 状态徽标 + 字段表；Experiment 附 “Command 仅展示，不会执行” 说明）。
- `src/app/research/[type]/page.tsx`：列表页；`isResearchType(rawType)` 校验非法 type → `notFound()`。
- `src/app/research/[type]/[id]/page.tsx`：详情页；解析代码项目名（`useProjects`）、研究项目名（`useResearchProjects`）、数据集名（`useDatasets`）；未找到 → 友好 404 + 返回列表。
- `src/app/research/page.tsx`（概览）：6 计数卡（链到各类型列表）+ 实验状态汇总 + 数据集可用性汇总 + 最近活动（复用 `useActivities()` + `ActivityTimeline`，不改 Activity schema）。
- 删除旧 `src/components/research/ResearchItemCard.tsx`。

## 9. Polling

研究走 **REST + 30s polling**；未新增 SSE，Phase 4 `RealtimeProvider` 未改动；离线/睡眠沿用 `useReachability()` + `OfflineBanner`/`SleepingBanner`/`OfflineState`/`LivePill`。

## 10. Security

- 全部研究 API `require_access`；匿名（LAN）→ 401（测试断言裸 client 401；`_LOCAL_HOSTS` 内 localhost 放行）。
- 研究代码无 `open()/subprocess/os.system/exec/eval/shell`；路径/命令字段仅 metadata 展示，不读取不执行。
- `config/research.yaml` 无凭据（token/password/key 均未出现）；前端无后端密钥；无秘密日志。

## 11. Testing

- 后端 `tests/test_research.py`（7 用例）：6 list + 6 detail 字段断言、unknown 404、裸 client 401、空 registry → `[]`、bad YAML → `ResearchRegistryError`、`research_project_id` 关系一致性（引用必须存在的研究项目 id）。
- 前端 `research.mappers.test.ts`（16 用例）：6 mapper + registry helpers（`isResearchType`/`toResearchListItem`/`toResearchDetailFields` 解析 + 缺失标记）+ 5 组状态 tone。
- 前端 `research-list.test.tsx`（4 用例）：ResearchList（标题/状态/副标题/标签/相对时间/详情链接）、ResearchDetail（实验字段、解析后名称、command display-only 说明）。
- 回归：`uv run pytest` **64 passed**；`pnpm test` **65 passed**；`pnpm typecheck` / `pnpm lint` / `pnpm build` 全绿。

## 12. iPad / LAN Verification

- 后端重启部署研究路由后，`GET /api/v1/research/projects` → 200（6 项目）、`/papers` → 8（含正确 status）。
- 前端响应式 grid（`sm:grid-cols-2 xl:grid-cols-3` / 概览 6 列）+ `min-w-0`/`truncate`，无横向溢出；整卡可点（≥44px）；返回导航可回到类型列表。

## 13. Files Changed

新增：`backend/app/schemas/research.py`、`backend/app/services/research_service.py`、`backend/app/api/routes/research.py`、`backend/config/research.yaml`、`backend/tests/test_research.py`、`src/lib/research.ts`、`src/components/research/{icons,ResearchList,ResearchDetail}.tsx`、`src/app/research/[type]/page.tsx`、`src/app/research/[type]/[id]/page.tsx`、`src/test/research.{mappers,list}.test.ts(x)`。

修改：`backend/app/core/config.py`、`backend/app/main.py`、`src/types/index.ts`、`src/lib/{backend,api,status,i18n}.ts`、`src/hooks/index.ts`、`src/mock/research.ts`、`src/app/research/page.tsx`。

删除：`src/components/research/ResearchItemCard.tsx`。

（`README.md` 与 `docs/PHASE_7_PLAN.md` 为工作区既有改动，未纳入，后者已被本阶段方案取代。）

## 14. Known Limitations

- 研究元数据来自静态 `research.yaml`，不读外部研究目录/PDF/数据集，真实文件状态（论文是否被读、数据集是否在盘）尚不可知。
- Experiment 的 `metrics` 为自由 JSON，未做 schema 强校验。
- mock/real 的 `project_id` 各自独立（mock 用 mock 项目 id，real 用 `projects.yaml` id），由 seam 隔离。
- 概览 “最近活动” 复用全局 Activity 时间线，未按研究项目过滤（无 `research_project_id` 关联，符合本阶段方案）。

## 15. Phase 8 Recommendation

进入真实 Research runtime：建立只读事件源（文件变更/目录扫描）把 Paper/Dataset/Experiment 状态接到真实盘数据；为 Activity 写入生命周期落地三关联持久化（届时对 SQLite 做幂等迁移）。RAG/embedding/向量库/研究 agent 仍在禁区，Research Execution Plane 继续后置。