# Phase 5 — Projects Control Plane（完成报告）

> Silence Personal Control Center · v0.1
> 状态：**已完成**，待用户验收（未提交 git）。

---

## 1. 概览

将 Phase 4 遗留的“Project 基本信息展示”升级为**只读 Project Control Plane**：真实 Git 状态的**列表 + 详情页**，含 Node 关联、健康度、完整 Git 元数据，并为未来 Execution Plane 预留结构（仅 `node_id`/`project_id` 关联，不实现执行）。

完成前后对比：

| 维度 | Phase 4（旧） | Phase 5（新） |
|---|---|---|
| 数据来源 | 真实 Git（branch / porcelain / last commit） | 真实 Git + **remote / ahead / behind / 完整 HEAD** |
| Node 关联 | 无 | `node_id`（registry 可选，缺省 `settings.node_id`） |
| 健康度 | `git_status` 单字段 | `health` = healthy/dirty/error/unknown（聚合） |
| 前端模型 | Mock/Real 语义漂移（`repository`/`lastCommit`） | 统一领域模型 |
| 页面 | 仅列表 | **列表 + `/projects/[id]` 详情** |
| 详情接口 | `fetchProject` 全量列表 find（技术债） | **直连 `GET /projects/{id}`** + 404 |
| 刷新 | mount + wake | 30s REST（不进 SSE） |
| Git 子进程 | 5 次/项目 | **≤3 次/项目**（合并） |

---

## 2. 目标与范围

**In scope**：`node_id`、`health`、`remote`、`ahead`、`behind`、完整 `head`、`modified`、`lastCommitTime`；详情页；30s 刷新；`fetchProject` 直连；mock 对齐；前后端测试；iPad 局域网验证；本文档。

**Out of scope（明确不做）**：Coding Agent、agent 执行、远程 shell、git 写按钮、分支切换、文件编辑、部署、CI/CD、Docker 控制、research/robotics/data-center 后端、Activity 执行记录。全部维持 mock / 占位。

---

## 3. 冻结（未改，保证 Phase 3/4 不回归）

- **路由与鉴权**：`GET /api/v1/projects`、`GET /api/v1/projects/{id}` 的 URL / `require_access` / 响应外层结构不变；`ProjectOut` **只加字段，不改名/不删**已有字段。
- **其它业务**：`nodes / metrics / services / power / activities / commands / events / auth` 全部零改动；SSE 未动（Project 不入流）。
- **DB**：仍 registry 驱动（`config/projects.yaml`），**未新增 SQLite 表**。
- **依赖**：**零新增**（后端 `yaml` 已有，前端现有 icon/工具已够）。
- **Git**：全程只读（status/branch/log/rev-parse/remote get-url），无任何写子命令。

---

## 4. 架构

```
Project Registry (config/projects.yaml, 可选 node_id)
        ↓
project_service.build_project (node 关联 + health 聚合)
        ↓
git_service.snapshot / remote / head…  (只读, ≤3 子进程)
        ↓
ProjectOut (REST: GET /projects, GET /projects/{id})
        ↓
backend.ts mapProject (snake→camel) → api.ts (mock/real seam)
        ↓
useProjects(30s) / useProject(id) → ProjectCard / ProjectList / /projects/[id]
```

Node 关联：registry 每条可写 `node_id`（缺省回落到 `settings.node_id = "macbook-pro"`）；前端用 `useNodes()` 解析节点显示名，不回退则显示 `nodeId` 原值。

---

## 5. 后端实现

### 5.1 Schema（`backend/app/schemas/project.py`，add-only）

```
ProjectOut:
  id, name, node_id, path, type="git",
  branch?, git_status?, health?, modified, remote?,
  ahead?, behind?, head? (完整 40 位), last_commit? (短 hash),
  last_commit_subject?, last_commit_time?
```

### 5.2 Git 服务（`backend/app/services/git_service.py`）

新增只读函数：`head()`（`rev-parse HEAD`）、`remote()`（`remote get-url origin`，无 origin → `None`）、`ahead_behind()`／`_parse_ahead_behind()`（解析 `## branch...[ahead N, behind M]`）、`snapshot()`（一次合并读取）。

`snapshot()` 用 **2 个子进程**完成 branch/ahead/behind/modified（`status --porcelain=v1 --branch`）与 head/short_hash/subject/time（`log -1 --format=%H%x00%h%x00%s%x00%cI`）；`remote` 再加 1 次 → 每项目 **≤3 子进程**（旧 5 次）。全部 `timeout=10`、`capture_output`、非零抛 `GitError`、无 `shell=True`。

### 5.3 Project 服务（`backend/app/services/project_service.py`）

`build_project()` 派生：
- `node_id = entry.get("node_id") or settings.node_id`
- `health`：clean→**healthy**、dirty→**dirty**、not_found/not_a_repo/error→**error**、unconfigured→**unknown**
- **安全日志**：Git 失败告警日志已去掉绝对 `path`，只保留 `project_id`（§26 防路径泄露）。

---

## 6. API 变更（add-only）

| 端点 | 变更 |
|---|---|
| `GET /api/v1/projects` | `ProjectOut` 增加 `node_id/health/remote/ahead/behind/head`，其余不变 |
| `GET /api/v1/projects/{id}` | 同上；仍返回**单对象**，404 语义不变 |

---

## 7. 前端领域模型（`src/types/index.ts`）

```
ProjectHealth = "healthy" | "dirty" | "error" | "unknown"
WorkingTree   = "clean"  | "dirty" | "unknown"

Project {
  id, name, nodeId,
  repositoryPath,       // 统一 = 仓库路径
  repositoryType,       // "git"
  remote?, branch,
  health: ProjectHealth,
  workingTree: WorkingTree,
  modified?,            // 工作区改动文件数
  ahead?, behind?, head?,
  lastCommitHash,       // 短 hash
  lastCommitSubject,    // 提交主题（统一语义）
  lastCommitTime?,      // ISO
  activity?, description?, tech?,
}
```

关键修正：**消除 Mock/Real 语义漂移**——`repository`→`repositoryPath`（一律路径）、`lastCommit`→`lastCommitSubject`（一律主题），`repositoryType/health/workingTree/head/ahead/behind/lastCommitTime` 补齐。

---

## 8. 前端实现

| 文件 | 变更 |
|---|---|
| `src/lib/backend.ts` | `BProject` 补字段；`mapProject` 重写（snake→camel + health/workingTree 派生）；`fetchProject(id)` **直连 `/projects/{id}`**，404 → `undefined`（修技术债） |
| `src/lib/api.ts` | 无改动（`getProject` 仍走 mock/real seam，返回类型随新 `Project`） |
| `src/hooks/index.ts` | 新增 `useProject(id)`；`useProjects` 已带 30s 刷新（沿用 `MEDIUM_REFRESH_MS`） |
| `src/lib/status.ts` | 新增 `projectHealth()` / `workingTreeStatus()`（healthy→success、dirty→warning、error→error、unknown→neutral） |
| `src/lib/format.ts` | 新增 `formatRelativeAgo(iso)`（"2h ago"/"30m ago"/"now"） |
| `src/lib/i18n.tsx` | 新增 `status.healthy/dirty`、`project.*`（node/repository/branch/head/working tree/remote/ahead/behind/latestCommit/…）、`section.git/repository/activity`、`project.notFound/back/noRecentCommit/activityReserved` |
| `src/mock/projects.ts` | 6 个 mock 全量对齐新模型（`nodeId`、路径、`workingTree/health/head/ahead/behind/lastCommitTime` 等） |
| `src/components/project/ProjectCard.tsx` | node/branch + working-tree 徽标 + 改动数 + 最近提交(短 hash·主题·相对时间) + 整卡链接详情 |
| `src/components/project/ProjectList.tsx` | (dashboard 复用) 名称 + branch + working-tree 徽标 + 相对时间 |
| `src/app/projects/page.tsx` | 加 `LivePill` + `OfflineBanner/SleepingBanner/OfflineState`；头部统计改为 `{count} 仓库 · {dirty} 有改动` |
| **新增** `src/app/projects/[id]/page.tsx` | 详情页：Repository 卡 + ProjectGitInfo + Latest Commit + Activity 占位 + 健康徽标 + 离线/过期处理 |
| **新增** `src/components/project/ProjectGitInfo.tsx` | 可复用 Git 信息块（branch/HEAD/working tree/remote/ahead/behind） |

---

## 9. 测试

### 后端（`backend/tests/`，49 passed）

- **扩展 `test_projects.py`**：dirty 工作区、remote + 完整 head、missing repo(`not_found`)、non-git(`not_a_repo`)、unconfigured、registry `node_id`、404、裸客户端 401（`POST/GET` 鉴权）。
- **新增 `test_git_service.py`**：`_parse_ahead_behind` 纯函数多分支、`head` 40 位、`remote` 有/无、`ahead_behind` 无 upstream、`snapshot`（clean/dirty/空仓库无提交）、缺失仓库抛 `GitError`。
- 全部使用 `tmp_path` 临时仓库，测试结束自动清理，**绝不触碰真实项目**。

### 前端（`src/test/`，33 passed）

- **新增 `project.mappers.test.ts`**：`mapProject` snake→camel（node/health/workingTree/remote/ahead/behind/head/提交字段/unknown 归一/零 modified 排除）+ `projectHealth`/`workingTreeStatus` 色调。
- **新增 `project-list.test.tsx`**：`ProjectList` 渲染名称/branch/working-tree 徽标/相对时间（`I18nProvider` 包裹）。

### 回归门禁（全绿）

```bash
cd backend && uv run pytest   # 49 passed（Phase 3 基线 32 无回归）
pnpm test                     # 33 passed（Phase 4 基线 23 无回归）
pnpm typecheck                # 通过
pnpm lint                     # 无警告/错误
pnpm build                    # 通过（.env.local 实模式，11 页含 /projects/[id]）
```

---

## 10. iPad / 局域网验证（真实数据）

后端 `0.0.0.0:8000`、前端 `0.0.0.0:3000`（`http://10.101.184.21:3000`）均已重跑最新代码：

```
GET /api/v1/projects → 7 个项目，均含 node_id/health/remote/ahead/behind/head
   coding-video    dirty   mod=18
   lumoguide       dirty   mod=1   behind=46  remote=True
   instant-messaging dirty mod=4   behind=8   remote=True
   booking-platform clean healthy  behind=27  remote=True
   obsidian-plugin  dirty  mod=8   remote=True
   lumotrip         clean healthy  remote=True
   second-brain     dirty  mod=2   remote=True
GET /api/v1/projects/{id} → 单对象（16 字段）
GET /api/v1/projects/does-not-exist → 404
GET /projects（前端 shell）→ 200
```

> 说明：真实仓库中 `ahead` 均为 `None`（这些仓库当前相对 upstream 只“落后”不“领先”）；`behind` 有真实值，印证只读 ahead/behind 解析正确。

---

## 11. 安全与只读约束

- 只读 git（无 commit/push/pull/checkout/reset/merge/rebase/clean），`timeout=10`、`capture_output`、非零不崩（返回 `error` 状态而非 500）。
- repo 路径只来自 trusted registry；**Git 告警日志不再输出绝对路径**。
- API 继续 `require_access`（localhost / admin `api_token` / device `access_token`），**无新增 token、无硬编码、无 secret 进前端、不在 URL 传 token**。
- SSE ticket 流未动；Project 数据不经 5s SSE。

---

## 12. 文件清单

**修改**：`backend/app/schemas/project.py` · `backend/app/services/git_service.py` · `backend/app/services/project_service.py` · `backend/tests/test_projects.py` · `src/types/index.ts` · `src/lib/backend.ts` · `src/hooks/index.ts` · `src/lib/status.ts` · `src/lib/format.ts` · `src/lib/i18n.tsx` · `src/mock/projects.ts` · `src/components/project/ProjectCard.tsx` · `src/components/project/ProjectList.tsx` · `src/app/projects/page.tsx`

**新增**：`backend/tests/test_git_service.py` · `src/app/projects/[id]/page.tsx` · `src/components/project/ProjectGitInfo.tsx` · `src/test/project.mappers.test.ts` · `src/test/project-list.test.tsx`

---

## 13. 已知限制 / 技术债（不阻塞，已记录）

- **`ahead` 真实值未覆盖线上样例**：现有仓库只落后不领先，`ahead` 解析靠 `_parse_ahead_behind` 纯函数单测兜底。
- **`fetchNode(id)` 仍是全量列表 find**：Phase 4 遗留技术债，与本次 `fetchProject` 同源但不在 Phase 5 范围（§44），保持不动。
- **Activity 关系仅预留 `node_id`/id**：未建 `project_id` 的 Activity 关联（等你又要 Execution Plane 时再加）。
- **无 Git 结果缓存**：30s×7 项目×≤3 子进程 ≈ 21 次/轮询，量小可接受；多设备后可按需加 10s 内存 TTL。
- **`Capability` 前端/后端取值漂移**（sleep/wake vs 5 值）：Phase 4 遗留，未动。

---

## 14. Definition of Done

- [x] 列表页展示：node / repository / branch / 工作区(CLEAN/DIRTY) / health / 最近提交
- [x] 详情页 `/projects/[id]`：完整 Git 元数据 + 健康徽标 + 离线/过期处理
- [x] `node_id` 关联 + registry 可选覆盖
- [x] Git 只读、加 `remote/ahead/behind/head`、子进程合并 ≤3
- [x] `fetchProject(id)` 直连详情接口
- [x] 30s 刷新，不进 SSE
- [x] Mock/Real 语义统一，`NEXT_PUBLIC_USE_MOCK` 双模式可用
- [x] 回归：pytest 49 / pnpm test 33 / typecheck / lint / build 全绿
- [x] 未新增依赖、未新增 DB、未 commit、未改 Phase 3/4 契约

---

## 15. 下一步（待你决定，未实施）

- 是否把 `ahead`/`behind` 长滞后仓库（behind=46）在详情页加“未同步”高亮提示。
- 是否在列表卡片补 `Last Activity` 的相对时间精度（分钟级）。
- 是否进入 Phase 6（Execution Plane：Activity 按 `project_id` 关联，仍是只读/预留）。