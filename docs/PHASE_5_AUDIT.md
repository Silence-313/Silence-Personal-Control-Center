# Phase 5 — Projects Control Plane · 审计报告（Step 1）

> Silence Personal Control Center · v0.1 · **AUDIT ONLY**（本阶段未修改任何业务代码）

---

## 1. 当前仓库状态

| 项 | 值 |
|---|---|
| branch | `main` |
| commit | 仅 `d2d28d8 "first commit"` |
| working tree | `README.md` modified + 其余全部 untracked（`backend/ src/ docs/ …` 未 commit） |
| 说明 | Phase 3/4 全部代码仍在 working tree，用户尚未 commit（遵循“不 commit，由用户决定”） |

---

## 2. 当前 Project 数据模型

### 2.1 Frontend type（`src/types/index.ts`）

```ts
export type ProjectStatus = "clean" | "modified" | "ahead" | "behind" | "unknown";
export type ProjectActivity = "active" | "idle" | "archived";

export interface Project {
  id: string;
  name: string;
  repository: string;      // 实模式=绝对路径；mock 模式=仓库名（已漂移）
  branch: string;
  status: ProjectStatus;   // clean/modified/ahead/behind/unknown
  activity: ProjectActivity;
  lastCommit: string;      // 实模式=`短hash + subject`；mock=`"2h ago"`（已漂移）
  lastCommitHash: string;  // 短 hash
  description?: string;    // 实模式=path；mock=描述文本（已漂移）
  tech?: string[];         // 仅 mock 有
}
```

**缺失（Phase 5 需要）**：`nodeId`、`health`、`repositoryPath`、`repositoryType`、`remote`、`workingTree`（clean/dirty）、`ahead`/`behind`、`lastCommitTime`/`lastActivity`（ISO）、完整 `head`。

### 2.2 Backend schema（`backend/app/schemas/project.py`）

```py
class ProjectOut(BaseModel):
    id: str
    name: str
    path: str
    type: str = "git"
    branch: str | None = None
    git_status: str | None = None   # clean|dirty|not_found|not_a_repo|error|unconfigured
    modified: int = 0
    last_commit: str | None = None          # 短 hash
    last_commit_subject: str | None = None
    last_commit_time: str | None = None     # ISO
```

**缺失**：`node_id`、`health`、`remote`、`ahead`、`behind`、完整 `head`。

### 2.3 Database model

**不存在** Project DB 模型。`backend/app/models/` 仅 `command.py / device.py / node.py`。Project 是 **registry 驱动**（YAML），不落 SQLite。这一点符合“复用 registry”的要求，**无需新增 DB 表**。

### 2.4 Registry（`backend/config/projects.yaml`）

- 7 条，均为 `type: git`：`coding-video / lumoguide / instant-messaging / booking-platform / obsidian-plugin / lumotrip / second-brain`。
- 每条仅 `{id, name, path}`。**没有 `node_id`**（当前隐式=本机）。
- `settings.projects_config` 默认指向此文件（`config.py`），支持 env 覆盖。

### 2.5 Endpoints（`backend/app/api/routes/projects.py`）

```text
GET /api/v1/projects          → list[ProjectOut]
GET /api/v1/projects/{id}     → ProjectOut | 404
```
均挂 `dependencies=[Depends(require_access)]`，无 `/git` 子端点。

---

## 3. 当前 Project API

| 项 | 值 |
|---|---|
| Auth | `require_access`（localhost / `api_token` / device `access_token`），与 nodes/metrics 一致 |
| Response | snake_case `ProjectOut` |
| Error | 统一 `ErrorResponse{error:{code,message}}`（`main.py` 全局 handler）；404 → `HTTPException(404,"Project not found")` |
| Data source | `project_service.load_registry()` 读 YAML → `build_project()` 逐项目实时执行 git（**无缓存**，每次请求重新 git） |
| CORS | 已有 `allow_origins`，Phase 5 不改 |

---

## 4. 当前 Git 能力（`backend/app/services/git_service.py`）

已实现（**真实 git，非 mock**，live 已验证返回真实 branch/hash/subject/time）：

| 函数 | 命令 | 说明 |
|---|---|---|
| `branch` | `git branch --show-current` | |
| `porcelain` | `git status --porcelain` | 用于 `modified` 计数 |
| `last_commit_hash` | `git log -1 --format=%h` | **短 hash**（非 40 位 HEAD） |
| `last_commit_subject` | `git log -1 --format=%s` | |
| `last_commit_time` | `git log -1 --format=%cI` | ISO |

安全性已满足：`["git","-C",str(path),*args]` 无 `shell=True`；path 只来自 trusted registry；`timeout=10`；`capture_output`；非零退出抛 `GitError`；不 crash。

**缺失（Phase 5 需要）**：`remote`（origin URL）、`ahead`/`behind`、**完整 HEAD**（`rev-parse HEAD`）。当前为每项目 5 次 `git` 子进程（branch + porcelain + log×3），7 项目 = 35 次子进程/请求（有性能优化空间，见 §8）。

---

## 5. 当前 UI

- `src/app/projects/page.tsx` — 列表页（grid + `ProjectCard`）。
- `src/components/project/ProjectCard.tsx` — 显示 name / repository / branch / lastCommit / status badge / description / tech。
- `src/components/project/ProjectList.tsx` — 精简列表（name/branch/status badge）。
- **无** `src/app/projects/[id]/page.tsx`（**详情页缺失**）。
- **无** `useProject(id)` hook（`api.getProject(id)` 存在但未暴露为 hook）。
- i18n：`page.projects` / `page.projectsDesc` 存在；状态用 `status.clean/modified/ahead/behind/unknown`。

---

## 6. 当前测试

| 层 | 现状 | baseline |
|---|---|---|
| Backend | `tests/test_projects.py`：git_service 读、空 registry、从 registry 列表/详情、clean 状态 | 32 passed |
| Frontend | `src/test/backend.mappers.test.ts` **未覆盖 `mapProject`**；无 project 组件测试 | 23 passed |

后端已覆盖：list / detail / branch / subject / clean。**未覆盖**：dirty working tree、ahead/behind、remote、invalid(404)、missing repo(`not_found`)、non-git(`not_a_repo`)、auth(401 for projects)，以及新增字段 mapper。

---

## 7. 问题（Gaps）

1. **无 `node_id` 关联**：后端 `ProjectOut`、frontend `Project` 均无 node 关联；registry 条目也无 `node_id`。违 §7/§31 多节点要求。
2. **无 Project Health**：`git_status` 只有 clean/dirty/not_found/not_a_repo/error/unconfigured，未聚合为 HEALTHY/DIRTY/ERROR/UNKNOWN；前端坏仓库一律显示 `unknown`、无法区分 error。
3. **Git 信息不全**：无 `remote`、`ahead`/`behind`、完整 HEAD。
4. **无详情页** `/projects/[id]`，无 `useProject` hook。
5. **类型漂移**：mock `repository`=仓库名、`lastCommit`=`"2h ago"`；real `repository`=绝对路径、`lastCommit`=`"<hash> <subject>"`。同一字段双语义。
6. **性能**：每请求 5 次 git 子进程 × 7 项目（可合并为 ~2 次）。
7. **列表不刷新**：`useProjects` 无 30s 中频刷新（仅 `silence:wake` 重取）。
8. **Activity 无 `projectId`**：Phase 5 仅需预留结构，不建执行流。
9. **前端 `fetchProject(id)` 拉全量再 find**（与 `fetchNode` 同类技术债，但直接阻碍详情页/404 正确性）。

---

## 8. 建议改动（Proposed changes，待 Step 2 计划确认）

**Backend（additive，保持 ProjectOut 向下兼容）**
- `ProjectOut` 增加：`node_id`、`health`、`remote`、`ahead`、`behind`、`head`（完整 SHA），保留现有字段。
- `git_service` 增加只读：`head`（`rev-parse HEAD`）、`remote`（`remote get-url origin`）、`ahead/behind`（`status --porcelain=v1 --branch` 解析），并可合并调用减少子进程。
- `project_service` 派生 `health`：clean→healthy、dirty→dirty、not_found/not_a_repo/error→error、unconfigured→unknown；`node_id` 取自 registry 条目 `node_id`（缺省 `settings.node_id`）。
- registry 支持可选 `node_id`（不动现有 7 条，缺省回落到本机）。
- 新增/扩展 `tests/test_projects.py` + `tests/test_git_service.py`。

**Frontend**
- `types`：`Project` 增加 `nodeId`、`health`、`repositoryPath`、`repositoryType`、`remote?`、`workingTree`、`ahead`/`behind`、`lastCommitTime`、`head`；统一 mock/real 双语义。
- `backend.ts`：`mapProject` 增加新字段映射（snake→camel）；`fetchProject(id)` 改走 `GET /projects/{id}`。
- `hooks`：新增 `useProject(id)`；`useProjects` 加 30s 中频刷新。
- UI：新建 `src/app/projects/[id]/page.tsx`（详情）＋ 更新 `ProjectCard` 显示 node/branch/health/HEAD/last commit/working tree；列表页接 OfflineBanner（last-known + STALE）。
- Mock：更新 `src/mock/projects.ts` 补齐新字段，保持 `NEXT_PUBLIC_USE_MOCK=true` 可工作。
- 新测试：`mapProject`、project 列表/详情渲染、loading/error/stale、mock/real 缝隙。

**Realtime**：Project 不进 5s SSE；仅 30s REST + `silence:wake`/visibility 刷新（符合 §19）。

---

## 9. 风险（Risks）

- **契约兼容**：必须只增字段、不改 `nodes/metrics/services/power/activities/commands/events/auth` URL/鉴权/形状（§18）。
- **Git 只读**：严禁 commit/push/checkout/reset 等；测试必须用 `/tmp` 临时 git repo 并清理（§28/§30）。
- **path 安全**：repo path 只来自 trusted registry，不把绝对路径打满日志（§26）。
- **敏感信息**：`projects.yaml` 含用户绝对路径，API 已有鉴权；不打印 token/ticket。
- **性能**：避免每项目一个 polling timer；列表一次 git，30s 即可（§34）。

---

## 10. Files To Change

- `backend/app/schemas/project.py`、`backend/app/services/git_service.py`、`backend/app/services/project_service.py`
- `src/types/index.ts`、`src/lib/backend.ts`、`src/hooks/index.ts`、`src/lib/api.ts`（可能无需改，`getProject` 已存在）
- `src/components/project/ProjectCard.tsx`、`src/mock/projects.ts`、`src/app/projects/page.tsx`

## 11. Files To Create

- `src/app/projects/[id]/page.tsx`（详情页，可能 + `ProjectGitInfo`/`ProjectStatus` 小组件）
- `src/test/project.mappers.test.ts`（或并入 backend.mappers.test）
- `backend/tests/test_git_service.py`（或扩展 test_projects.py）

## 12. Tests Required

- Backend：list / detail / branch / dirty / ahead-behind / remote / invalid(404) / missing repo(`not_found`) / non-git(`not_a_repo`) / auth(401) / health 派生。
- Frontend：`mapProject`（snake→camel）、project 列表/详情渲染、loading、error、stale（last-known）、mock 模式、real 缝隙。
- 回归：`uv run pytest`（必须 ≥ 当前 32）、`pnpm test`（必须 ≥ 当前 23）、`pnpm typecheck`、`pnpm lint`、`pnpm build`。

---

## 13. 结论

当前 Project 已有“**真实 Git 基础读取 + 列表 REST**”的骨架，但离“Project Control Plane”还缺：**node 关联、health 聚合、完整 Git 元数据（remote/ahead-behind/full HEAD）、详情页、中频刷新、以及前后端字段对齐与测试**。下一步是 Step 2 的 `PHASE_5_PLAN.md`（只增不改、Git 只读、mock/real 双模式不破坏）。

**STOP — 等待批准后再进入 Implementation。**