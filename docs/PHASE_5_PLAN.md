# Phase 5 — Projects Control Plane

> Silence Personal Control Center · v0.1
> **Implementation Plan**

---

## 0. Phase Overview

### Phase

**Phase 5 — Projects Control Plane**

### Goal

将当前已有的：

> Project Registry + Real Git Read-only + REST List/Detail

升级为一个完整、可靠、可扩展的：

> **Projects Control Plane**

本阶段重点不是执行项目操作，而是建立统一的 **Project 状态观察与控制面**。

Phase 5 完成后，iPad Control Center 应能够可靠展示：

```text
Project
├── Node
├── Repository
├── Branch
├── Health
├── Working Tree
├── Remote
├── Ahead / Behind
├── HEAD
├── Last Commit
└── Last Activity
```

同时支持：

```text
Projects List
       │
       ├── Project Detail
       │
       ├── Git Status
       │
       └── Node Association
```

---

# 1. Current State

Phase 4 已经完成：

* Frontend REST integration
* Backend REST API
* Authentication
* Device pairing
* SSE infrastructure
* Offline / stale state
* Dashboard realtime metrics
* Sleep / Wake integration
* Frontend test infrastructure

当前 Project 已具备：

```text
projects.yaml
      ↓
project_service
      ↓
git_service
      ↓
ProjectOut
      ↓
backend.ts
      ↓
useProjects()
      ↓
ProjectCard
```

目前 Git 数据是真实数据，而不是 mock。

Backend 已能够读取：

* branch
* working tree modified count
* last commit hash
* last commit subject
* last commit time

当前 API：

```text
GET /api/v1/projects
GET /api/v1/projects/{id}
```

均经过：

```text
require_access
```

鉴权。

---

# 2. Phase 5 Problems

当前 Project Control Plane 存在以下主要缺口：

## 2.1 Node Association

Project 当前没有：

```text
node_id
```

导致未来多 Mac / Remote Node 无法区分：

```text
Project
   ↓
Which Node?
```

---

## 2.2 Project Health

当前：

```text
git_status
```

不足以直接表达用户界面的健康状态。

需要形成：

```text
HEALTHY
DIRTY
ERROR
UNKNOWN
```

---

## 2.3 Git Metadata 不完整

当前缺少：

```text
remote
ahead
behind
HEAD
```

因此无法完整展示 Repository 状态。

---

## 2.4 Frontend Project Type Drift

Mock 与 Real 当前存在字段语义漂移。

例如：

```text
repository
```

Real：

```text
absolute filesystem path
```

Mock：

```text
repository name
```

以及：

```text
lastCommit
```

Real：

```text
short hash + subject
```

Mock：

```text
"2h ago"
```

需要统一领域模型。

---

## 2.5 Project Detail 缺失

当前没有：

```text
/projects/[id]
```

因此用户只能看到 Project List。

---

## 2.6 Project Hook 缺失

当前没有：

```text
useProject(id)
```

需要建立标准 domain hook。

---

## 2.7 Git 查询效率

当前：

```text
7 projects
×
5 git subprocess
=
35 subprocess/request
```

需要减少 Git subprocess 数量。

---

## 2.8 Project Refresh

Project 当前主要依赖：

```text
mount
silence:wake
```

需要增加：

```text
30s REST refresh
```

Project 不进入 5s SSE。

---

# 3. Phase 5 Scope

## In Scope

本阶段实现：

### Backend

* Project schema 扩展
* Node association
* Project health
* Remote
* Ahead / Behind
* Full HEAD
* Git subprocess 优化
* Registry optional `node_id`
* Backend tests

### Frontend

* Project domain type 扩展
* Backend mapper
* Real Project Detail API
* `useProject(id)`
* 30s Project refresh
* Project List UI
* Project Detail UI
* Mock/Real 对齐
* Frontend tests

### Verification

* Backend regression
* Frontend regression
* TypeScript
* ESLint
* Production build

---

# 4. Explicitly Out of Scope

Phase 5 **禁止实现 Project Execution Plane**。

不实现：

```text
git commit
git push
git pull
git checkout
git reset
git merge
git rebase
git stash
```

也不实现：

```text
Build
Run
Test
Deploy
Agent execution
Terminal execution
```

Project 只读。

---

## 4.1 不实现 Project Database

继续使用：

```text
backend/config/projects.yaml
```

作为 Project Registry。

不新增：

```text
projects table
```

不把 Project 状态写入 SQLite。

---

## 4.2 不接入 Project SSE

Project 不进入：

```text
5s SSE
```

使用：

```text
REST
  ↓
30s refresh
```

并在：

```text
wake
reconnect
visibilitychange
```

等情况下进行刷新。

---

## 4.3 不扩展 Research / Robotics

Phase 5 不处理：

```text
Research backend
Robotics backend
Agent execution
Data Center backend
```

这些属于后续 Phase。

---

# 5. Architecture

Phase 5 最终结构：

```text
                    iPad
                     │
                     ▼
          ┌─────────────────────┐
          │ Projects Control UI │
          └──────────┬──────────┘
                     │
                     ▼
                useProjects
                useProject
                     │
                     ▼
              backend.ts
                     │
                     ▼
              REST API /projects
                     │
                     ▼
                FastAPI
                     │
              ┌──────┴──────┐
              ▼             ▼
       project_service   require_access
              │
              ▼
       projects.yaml
              │
              ▼
          git_service
              │
              ▼
          Local Git Repo
```

---

# 6. Project Domain Model

Phase 5 统一 Project 模型。

目标模型：

```ts
Project {
  id
  name

  nodeId

  repositoryPath
  repositoryType
  remote

  branch

  health
  workingTree

  ahead
  behind

  head

  lastCommitHash
  lastCommitSubject
  lastCommitTime

  activity?
  description?
  tech?
}
```

其中：

```text
nodeId
```

用于未来多 Node。

---

# 7. Health Model

Backend 根据 Git 状态派生：

```text
git_status
       │
       ▼
health
```

映射：

| git_status   | health  |
| ------------ | ------- |
| clean        | healthy |
| dirty        | dirty   |
| not_found    | error   |
| not_a_repo   | error   |
| error        | error   |
| unconfigured | unknown |

Frontend 不自行猜测 Health。

Backend 是 Health 的事实来源。

---

# 8. Working Tree

Working Tree 与 Health 分离。

建议：

```text
workingTree:
  clean
  dirty
```

例如：

```text
health = healthy
workingTree = clean
```

或者：

```text
health = dirty
workingTree = dirty
```

这样 UI 不需要从一个字段推断另一个字段。

---

# 9. Git Information

每个 Project 应至少提供：

```text
Branch
Remote
Ahead
Behind
HEAD
Last Commit
Commit Time
Working Tree
```

示例：

```text
main
origin/main

HEAD
a82f3d1...

Ahead
2

Behind
0

Working Tree
DIRTY

Last Commit
a82f3d1 Fix motion pipeline
```

---

# 10. Node Association

Registry 支持：

```yaml
- id: second-brain
  name: Second Brain
  path: /path/to/project
  type: git
  node_id: macbook-pro
```

但现有 registry 不强制修改。

如果：

```text
node_id
```

不存在，则：

```text
settings.node_id
```

作为 fallback。

因此：

```text
explicit node_id
        ↓
settings.node_id
        ↓
current node
```

---

# 11. Backend Changes

## 11.1 `project.py`

扩展：

```py
ProjectOut
```

增加：

```text
node_id
health
remote
ahead
behind
head
```

保持原字段不删除。

---

## 11.2 `git_service.py`

新增只读 Git 查询：

```text
HEAD
remote
ahead
behind
```

优先减少 subprocess 数量。

可以利用：

```bash
git status --porcelain=v1 --branch
```

一次获取：

```text
branch
ahead
behind
working tree
```

并使用：

```bash
git rev-parse HEAD
```

获取完整 HEAD。

Remote 使用：

```bash
git remote get-url origin
```

如果没有 origin：

```text
remote = null
```

不能让项目整体失败。

---

# 12. Git Security Rules

Git Service 必须继续使用：

```text
["git", "-C", path, ...args]
```

禁止：

```text
shell=True
```

Repository path 只能来自：

```text
trusted registry
```

禁止用户通过 API 直接传入 arbitrary filesystem path。

---

## 禁止执行任何写操作

以下命令禁止：

```text
commit
push
pull
checkout
reset
merge
rebase
stash
clean
```

Phase 5 Git Service 只允许：

```text
read-only inspection
```

---

# 13. Project Service

`project_service.py` 负责：

```text
Registry
   ↓
Node association
   ↓
Git inspection
   ↓
Health derivation
   ↓
ProjectOut
```

不要把 Health 推断逻辑放到 Frontend。

---

# 14. API Contract

继续保持：

```http
GET /api/v1/projects
GET /api/v1/projects/{id}
```

不修改现有 URL。

---

## List

```http
GET /api/v1/projects
```

返回：

```json
[
  {
    "id": "second-brain",
    "name": "Second Brain",
    "path": "...",
    "type": "git",
    "node_id": "macbook-pro",
    "branch": "main",
    "git_status": "clean",
    "health": "healthy",
    "modified": 0,
    "remote": "...",
    "ahead": 0,
    "behind": 0,
    "head": "...",
    "last_commit": "...",
    "last_commit_subject": "...",
    "last_commit_time": "..."
  }
]
```

具体 response 以现有 schema 为准，只做 additive extension。

---

# 15. Detail API

Frontend：

```text
fetchProject(id)
```

必须真正调用：

```http
GET /api/v1/projects/{id}
```

禁止继续：

```text
GET /projects
       ↓
find(id)
```

这样才能正确处理：

```text
404
```

---

# 16. Frontend Type System

修改：

```text
src/types/index.ts
```

Project 类型统一为 Real / Mock 共用领域模型。

增加：

```text
nodeId
health
repositoryPath
repositoryType
remote
workingTree
ahead
behind
lastCommitTime
head
```

不要让 UI 根据：

```text
USE_MOCK
```

改变业务字段语义。

---

# 17. Backend Mapper

修改：

```text
src/lib/backend.ts
```

`mapProject()` 必须完成：

```text
snake_case
      ↓
camelCase
```

例如：

```text
node_id
→
nodeId

last_commit_time
→
lastCommitTime

repository path
→
repositoryPath
```

同时保证旧字段继续可用。

---

# 18. Hooks

新增：

```ts
useProject(id)
```

标准行为：

```text
loading
data
error
stale
```

复用现有：

```text
useAsync
```

不要新增第二套异步状态系统。

---

## Project List

增加：

```text
30s refresh
```

禁止：

```text
per-card polling
```

禁止：

```text
7 个 Project × 7 个 timer
```

应该：

```text
useProjects()
      ↓
single refresh timer
```

---

# 19. Realtime Integration

Project 不使用 SSE。

数据流：

```text
Initial Load
     ↓
REST
     ↓
useProjects
     ↓
30s refresh
```

特殊事件：

```text
silence:wake
       ↓
refresh Projects
```

以及：

```text
visibilitychange
focus
reconnect
```

必要时重新拉取。

---

# 20. Offline / Stale

必须复用 Phase 4 已有：

```text
OfflineBanner
```

Project 页面需要区分：

```text
ONLINE
STALE
OFFLINE
```

如果 REST 请求失败但已有旧数据：

```text
显示 Last Known
+
STALE
```

禁止让旧 Git 信息看起来像当前实时状态。

---

# 21. Project List UI

Project Card 至少显示：

```text
Project Name
Node
Branch
Health
Working Tree
Last Commit
```

可以进一步显示：

```text
Ahead / Behind
```

但不要把 Card 做得过度复杂。

---

# 22. Project Detail UI

新增：

```text
src/app/projects/[id]/page.tsx
```

建议布局：

```text
Project Detail

┌──────────────────────────────┐
│ Project Name                 │
│ HEALTHY                      │
│ Node: MacBook Pro            │
└──────────────────────────────┘

Repository
──────────────────────────────
Path
Remote
Type

Git
──────────────────────────────
Branch
HEAD
Ahead
Behind
Working Tree

Last Commit
──────────────────────────────
Subject
Hash
Time
```

第一版不提供任何 Git 写操作按钮。

---

# 23. Mock Strategy

继续支持：

```text
NEXT_PUBLIC_USE_MOCK=true
```

Mock 必须具有与 Real 相同的字段语义。

禁止：

```text
repository = "second-brain"
```

如果 Real 语义是：

```text
repositoryPath
```

Mock 也应该提供合法的：

```text
repositoryPath
```

同样：

```text
lastCommitTime
```

必须是真正的时间字段。

不要再使用：

```text
"2h ago"
```

作为 `lastCommit`。

---

# 24. Testing

## Backend

至少覆盖：

```text
Project list
Project detail
Branch
Clean working tree
Dirty working tree
Ahead
Behind
Remote
Full HEAD
Invalid project → 404
Missing repo → not_found
Non-git repo → not_a_repo
Auth → 401
Health derivation
Node association
```

---

## Frontend

至少覆盖：

```text
mapProject
Project List
Project Detail
Loading
Error
Stale
Mock mode
Real mode
404
Node display
Health display
Git information
```

---

# 25. Regression Tests

Phase 5 完成前必须执行：

```bash
uv run pytest
```

要求：

```text
≥ current backend baseline
```

当前 baseline：

```text
32 passed
```

---

Frontend：

```bash
pnpm test
```

要求：

```text
≥ current frontend baseline
```

当前 baseline：

```text
23 passed
```

---

TypeScript：

```bash
pnpm typecheck
```

必须：

```text
PASS
```

---

Lint：

```bash
pnpm lint
```

必须：

```text
PASS
```

---

Build：

```bash
pnpm build
```

必须：

```text
PASS
```

---

# 26. Phase 5 Implementation Steps

## Step 1 — Audit

状态：

```text
DONE
```

输出：

```text
PHASE_5_AUDIT.md
```

---

## Step 2 — Plan

当前文档：

```text
PHASE_5_PLAN.md
```

状态：

```text
DONE
```

---

## Step 3 — Backend Contract

目标：

统一 Project API Contract。

任务：

```text
ProjectOut
node_id
health
remote
ahead
behind
head
```

完成后：

```text
Backend schema tests
```

---

## Step 4 — Git Service

实现：

```text
branch
working tree
remote
ahead
behind
HEAD
```

优化 subprocess。

完成后：

```text
git_service tests
```

---

## Step 5 — Project Service

实现：

```text
registry
→ node association
→ git inspection
→ health derivation
```

保持：

```text
read-only
```

---

## Step 6 — Backend Tests

运行：

```bash
uv run pytest
```

确认：

```text
existing tests pass
new tests pass
```

---

## Step 7 — Frontend Domain Model

修改：

```text
src/types/index.ts
```

统一 Project 类型。

---

## Step 8 — API Mapper

修改：

```text
src/lib/backend.ts
```

完成：

```text
ProjectOut
→
Project
```

---

## Step 9 — Project Fetching

修改：

```text
fetchProject(id)
```

确保：

```text
GET /projects/{id}
```

---

## Step 10 — Project Hooks

新增：

```text
useProject(id)
```

并为：

```text
useProjects
```

增加：

```text
30s refresh
```

---

## Step 11 — Project UI

实现：

```text
Project List
Project Card
Project Detail
```

---

## Step 12 — Mock Alignment

更新：

```text
src/mock/projects.ts
```

保证：

```text
mock === real domain shape
```

---

## Step 13 — Frontend Tests

增加：

```text
mapper tests
component tests
hook behavior
loading
error
stale
mock/real
```

---

## Step 14 — LAN / iPad Verification

使用 iPad 实际访问。

验证：

```text
Project List
Project Detail
Touch interaction
Responsive layout
Offline
Reconnect
STALE
```

---

## Step 15 — Full Regression

执行：

```bash
uv run pytest
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

全部 PASS。

---

## Step 16 — Documentation

生成：

```text
docs/phase-5-projects-control-plane.md
```

并生成：

```text
PHASE_5_COMPLETION_REPORT.md
```

---

# 27. Files Expected to Change

Backend：

```text
backend/app/schemas/project.py
backend/app/services/git_service.py
backend/app/services/project_service.py
backend/tests/test_projects.py
backend/tests/test_git_service.py
```

Frontend：

```text
src/types/index.ts
src/lib/backend.ts
src/hooks/index.ts
src/components/project/ProjectCard.tsx
src/app/projects/page.tsx
src/mock/projects.ts
```

---

# 28. Files Expected to Create

```text
src/app/projects/[id]/page.tsx
src/test/project.mappers.test.ts
backend/tests/test_git_service.py
docs/phase-5-projects-control-plane.md
PHASE_5_COMPLETION_REPORT.md
```

具体文件可以根据现有代码结构调整。

---

# 29. Compatibility Rules

Phase 5 必须遵守：

## Rule 1

只允许：

```text
additive API changes
```

禁止破坏现有 API。

---

## Rule 2

不得修改：

```text
nodes
metrics
services
power
activities
commands
events
auth
```

现有 API Contract。

---

## Rule 3

Project API URL 不改变：

```text
/api/v1/projects
/api/v1/projects/{id}
```

---

## Rule 4

继续支持：

```text
NEXT_PUBLIC_USE_MOCK=true
```

---

## Rule 5

继续支持：

```text
NEXT_PUBLIC_USE_MOCK=false
```

---

# 30. Security Requirements

必须保持：

```text
require_access
```

不能因为 Project API 新增字段而绕过鉴权。

禁止：

```text
token logging
```

禁止：

```text
absolute repository path logging
```

Repository path 不应进入普通日志。

---

# 31. Performance Requirements

Project 刷新：

```text
30 seconds
```

而不是：

```text
5 seconds
```

禁止每个 Project 独立 timer。

Git subprocess 应尽可能从：

```text
5 × N
```

降低。

目标：

```text
~2 × N
```

或更少。

---

# 32. Multi-Node Compatibility

虽然 Phase 5 只有：

```text
macbook-pro
```

但 Project 模型必须能够支持：

```text
MacBook Pro
Mac Studio
Remote Server
Cloud GPU
```

未来结构：

```text
Node
 │
 ├── Project A
 ├── Project B
 └── Project C
```

因此：

```text
Project.nodeId
```

必须在本阶段建立。

---

# 33. Phase 5 Success Criteria

Phase 5 完成必须满足：

### Backend

* [ ] Project schema 扩展完成
* [ ] node_id 可用
* [ ] health 可用
* [ ] remote 可用
* [ ] ahead 可用
* [ ] behind 可用
* [ ] full HEAD 可用
* [ ] Git 仍然完全只读
* [ ] registry 继续工作
* [ ] Backend tests PASS

### Frontend

* [ ] Project type 对齐
* [ ] mapper 对齐
* [ ] `useProject(id)` 完成
* [ ] Detail page 完成
* [ ] 30s refresh 完成
* [ ] Offline / Stale 正确
* [ ] Mock / Real 一致
* [ ] Frontend tests PASS

### Quality

* [ ] `uv run pytest` PASS
* [ ] `pnpm test` PASS
* [ ] `pnpm typecheck` PASS
* [ ] `pnpm lint` PASS
* [ ] `pnpm build` PASS
* [ ] iPad LAN verification PASS
* [ ] 无真实 Git 写操作
* [ ] 无新增数据库
* [ ] 无 Project SSE
* [ ] 无 commit

---

# 34. Definition of Done

Phase 5 只有在以下链路完整成立后才算完成：

```text
projects.yaml
      ↓
Project Registry
      ↓
Git Read-only Inspection
      ↓
Project Service
      ↓
ProjectOut
      ↓
Authenticated REST
      ↓
backend.ts
      ↓
Project Domain Model
      ↓
useProjects / useProject
      ↓
Project List
      ↓
Project Detail
      ↓
30s Refresh
      ↓
Offline / Stale
      ↓
Tests
      ↓
iPad Verification
```

---

# 35. Phase 5 Boundary

Phase 5 最终形成的是：

> **Project Observation & Control Plane**

而不是：

> Project Execution Plane

因此 Phase 5 结束后：

```text
iPad
 │
 ▼
Projects
 │
 ├── Inspect Git
 ├── Inspect Health
 ├── Inspect Node
 ├── Inspect Working Tree
 └── Inspect Repository
```

但不能：

```text
Commit
Push
Pull
Checkout
Build
Run
Deploy
```

这些能力留给后续 Phase。

---

# 36. Next Step

当前状态：

```text
Phase 5 Audit
     ✅

Phase 5 Plan
     ✅

Implementation
     ⏸
```

只有在用户明确确认：

> **开始 Phase 5 Implementation**

之后，才允许修改代码。

Implementation 必须从：

```text
Step 3 — Backend Contract
```

开始。

不得跳过：

```text
Audit
Plan
Approval
```

---

# 37. Final Principle

Phase 5 的核心不是“增加更多 Project UI”。

而是建立：

> **一个可靠、只读、可扩展、与 Node 绑定的 Project Control Plane。**

它将成为未来：

```text
Project
   ↓
Agent
   ↓
Task
   ↓
Build
   ↓
Experiment
   ↓
Artifact
```

整个 Personal Research OS 的基础之一。

**Phase 5 Implementation 必须保持最小化、只读、可验证，并为未来 Execution Plane 留出清晰边界。**
