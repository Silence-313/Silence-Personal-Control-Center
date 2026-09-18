# Silence Personal Control Center v0.1

> **Personal Research Operating System / Personal Control Center**
>
> 将 iPad Air M4 打造成个人科研、Coding、AI Agent、Robotics
> 与数据基础设施的统一控制台。

------------------------------------------------------------------------

# 1. Project Vision

``` text
                    iPad Air M4
                         │
                         ▼
              ┌─────────────────────┐
              │ Silence Personal    │
              │ Control Center      │
              └──────────┬──────────┘
                         │
                         ▼
                  Mac / Nodes
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Projects        Agents        Research
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Personal Data
                         │
                         ▼
                      2TB SSD
```

长期目标：

> **Silence Personal Control Center → Personal Research Operating
> System**

当前目标：

> **先把 iPad Air M4 做成真正可用的 Personal Control Center v0.1。**

------------------------------------------------------------------------

# 2. 现状总览 (Status Overview)

> 一句话：**Phase 0–10 已全部完成，控制台已在 iPad 上真实可用**；
> 但 Robotics / Data Center / Tasks 三处仍是**演示数据**，执行面尚未开放。

## 2.1 ✅ 已完成 —— 现在能用的（都做了什么）

**控制面（真实后端数据）：**

| 能力 | 说明 |
|---|---|
| 节点 & 指标 | Mac 节点注册、CPU / 内存 / 磁盘 / 网络实时指标、心跳 |
| 服务 & Docker | Docker 容器运行 / 停止数量（只读） |
| 电源 | 屏幕睡眠 / 唤醒（唯一的「执行」能力，需设备授权 + 管理员 token） |
| 项目 Projects | Git 只读：分支 / 远端 / HEAD / ahead-behind / 工作区 / 健康 / 最近提交 |
| 智能体 Agents | Agent 注册表 + 详情 + 状态 + 关联项目 / 会话 / 任务 |
| 会话 Sessions | Session 生命周期 + 关联智能体 / 项目 / 研究 |
| 研究 Research | 论文 / 项目 / 实验 / 数据集 / 笔记 / 报告 六类实体 + 筛选 |
| 知识 Knowledge | 自动索引知识图谱 + 搜索 / 类型过滤 + 上下文聚合视图 |
| 自动化 Automation | YAML 规则引擎，仅 notify / create_activity 两类安全动作 |
| 可观测性 Observability | 指标历史、健康评分、事件时间线（严重度 / 分类）、自动化运行记录 |
| 活动 Activity | 全系统统一事件时间线 |

**基础设施（跨页面）：**

- iPad Safari / PWA：manifest + 图标 + 「添加到主屏幕」
- 设备配对：设备码 + Mac 弹 6 位验证码 → access_token（见 `docs/USER_GUIDE.md` §4）
- 实时：SSE + 8s 轮询兜底；明确区分 online / sleeping / offline / stale
- 中英双语；演示数据徽章（`演示数据` / `DEMO DATA`）
- API 地址随页面 Origin 自动推导（局域网 IP 变化无需改配置）

## 2.2 🚧 未完成 —— 还没弄的

**仍是演示数据（真实后端未接入）：**

- 🤖 Robotics `/robotics` 整页（机器人 / 训练 / 实验）
- 🗄 Data Center `/data-center` 整页（2TB 数据层存储）
- ✅ 工作台「当前任务」区块（Tasks）

**执行面（Execution Plane）尚未开放** —— 目前唯一执行能力是屏幕睡眠 / 唤醒。
尚未实现：Docker 控制、Git 写入、命令 / Shell 执行、Agent 驱动、研究工作流、
机器人 / 训练控制。

**其他未做：**

- Security Hardening（只有基础配对 + LAN + 最小权限，正式加固未做）
- Tailscale 远程访问（现仅局域网）
- PWA 深优化（离线 shell / 深度安装 / 后台行为）
- E2E / 一键启停 / 部署 / CI
- 文档补全（API.md / SECURITY.md / DEPLOYMENT.md / ARCHITECTURE.md）

## 2.3 📜 开发历程 —— 都做过什么（Phase 0 → 10）

| Phase | 名称 | 做了什么 | 状态 |
|---|---|---|---|
| 0 | Environment & Capability Audit | Mac 能力盘点（CPU / RAM / 网络 / 电源 / Docker…） | ✅ |
| 1 | System Architecture | 前端 / 后端 / DB / 设备模型 / Adapter 架构定案 | ✅ |
| 2 | UI/UX Prototype | 13" iPad 横屏、Dark、Command Center 风格 | ✅ |
| 3 | Backend + Node Foundation | FastAPI；节点 / 指标 / 服务 / 电源；Git + Docker 只读；设备配对 | ✅ |
| 4 | Frontend Integration + Realtime | REST + SSE + 轮询兜底；离线 / stale；Dashboard 实时 | ✅ |
| 5 | Projects Control Plane | Git 只读项目控制面 | ✅ |
| 6 | Agent Control Plane | Agent 注册 / 详情 / 状态；Session 读模型；活动关联 | ✅ |
| 7 | Research Control Plane | 研究六类实体 | ✅ |
| 8 | Runtime & Activity Plane | Session 生命周期 + 统一活动时间线 | ✅ |
| 9 | Knowledge & Automation Plane | 知识图谱 + 上下文聚合 + 规则引擎 | ✅ |
| 10 | Observability & Intelligence Plane | 指标历史 / 健康 / 时间线 / 自动化运行 | ✅ |

> 每阶段完整报告见 `docs/phase-*-report.md`；使用指南见 `docs/USER_GUIDE.md`。

------------------------------------------------------------------------

# 3. Architecture

当前系统采用：

``` text
iPad Safari / PWA
        │
        │ LAN / future Tailscale
        ▼
   Next.js Frontend
        │
        │ REST / SSE
        ▼
    FastAPI Backend
        │
        ▼
   Control Plane
        │
        ├── Node / Metrics / Services / Power
        ├── Projects
        ├── Agents / Sessions
        ├── Research
        ├── Knowledge / Automation
        ├── Observability
        ├── Robotics      (UI + demo data)
        └── Data Center   (UI + demo data)
        │
        ▼
      Adapters
        │
        ▼
Mac / Linux / Future Mac Studio / GPU Server
```

核心设计原则：

-   **Local-first**
-   **Control Plane 与 Execution Plane 分离**
-   **Read-only 优先**
-   **Adapter-oriented**
-   **Mock / Real seam**
-   **设备统一 Device Model**
-   **明确 offline / sleeping / stale**
-   **最小权限**
-   **不要为了 UI 而引入不必要的基础设施**

------------------------------------------------------------------------

# 4. Current Technical Stack

## Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   App Router
-   Vitest
-   React Testing Library

## Backend

-   FastAPI
-   Python
-   Pydantic
-   SQLite
-   YAML Registry

## Communication

``` text
REST
  +
SSE
```

WebSocket
不再作为第一版实时通信的默认方案；除非后续出现明确需要双向长连接的场景。

## Infrastructure

-   macOS
-   Docker Desktop
-   Git
-   SSH
-   Homebrew
-   uv / Conda
-   future Tailscale

------------------------------------------------------------------------

# 5. 未来路线图（Planned —— 还没做的）

> 以下均处于「未开始」或「部分完成」。当前已完成至 Phase 10（见 §2.3）。

| 计划 | 内容 | 状态 |
|---|---|---|
| Robotics 后端接入 | G1 / N2 / GMR / GVHMR、MuJoCo、RL、运动数据集（现为演示数据） | ⏳ 未开始 |
| Data Center 后端接入 | 2TB SSD：数据集 / 模型 / 论文 / 视频 / 实验 / 检查点 / 制品 / 智能体 / 记忆 / 备份 | ⏳ 未开始 |
| Execution Plane | Docker 控制、Git 写入、命令执行、Agent 驱动、研究工作流、机器人 / 训练控制 | ⏳ 未开始 |
| Security Hardening | 鉴权 / 授权 / 能力权限 / 审计 / 限流 / 密钥处理 | ⏳ 未开始 |
| Tailscale | iPad → Tailscale → Mac / Mac Studio / GPU Server 远程访问 | ⏳ 未开始 |
| PWA 深优化 | 离线 shell、安装深度、后台行为、重连、电池 | 🚧 部分 |
| E2E / Deployment | 完整链路测试、一键启停 / 更新 | ⏳ 未开始 |
| Documentation | API.md / SECURITY.md / DEPLOYMENT.md / ARCHITECTURE.md | 🚧 部分 |

**Execution Plane 的前置安全边界（未满足前不开放执行能力）：**

- Authentication / Authorization
- Capability-based permission
- Audit log
- Confirmation（危险操作二次确认）
- Rate limiting
- Safe command boundary

------------------------------------------------------------------------

# 6. Core Architectural Rules

## Rule 1 --- Local-first

第一版不依赖：

-   AWS
-   Firebase
-   Supabase
-   SaaS database

------------------------------------------------------------------------

## Rule 2 --- Control Plane ≠ Execution Plane

``` text
Control Plane
    ↓
Observe / Organize

Execution Plane
    ↓
Act
```

必须保持边界。

------------------------------------------------------------------------

## Rule 3 --- Read-only first

尤其：

``` text
Git
Docker
Research
Robotics
Data
```

先观察，再执行。

------------------------------------------------------------------------

## Rule 4 --- Do not modify existing environments blindly

任何涉及：

-   Second Brain
-   Docker
-   Python
-   Conda
-   MuJoCo
-   Robotics
-   Git
-   SSH

的操作必须先审计。

------------------------------------------------------------------------

## Rule 5 --- Do not invent state

明确区分：

``` text
ONLINE
SLEEPING
OFFLINE
STALE
UNKNOWN
```

旧数据不能冒充实时数据。

------------------------------------------------------------------------

## Rule 6 --- iPad is the Control Surface

iPad 不承担主要计算。

``` text
iPad
  ↓
Control Surface

Mac / Server
  ↓
Compute / Execution
```

------------------------------------------------------------------------

# 7. Future Hardware

当前：

``` text
iPad Air M4
MacBook Pro M3 Pro 36GB
2TB External SSD
```

未来可能增加：

``` text
Mac Studio
Linux Server
GPU Server
Cloud GPU
```

统一抽象为：

``` text
Node
```

因此增加 Mac Studio 不应该要求重构整个系统。

------------------------------------------------------------------------

# 8. Current Development Principle

每个 Phase 都遵循：

``` text
Audit
  ↓
Analyze
  ↓
Design
  ↓
Plan
  ↓
User Approval
  ↓
Implement
  ↓
Test
  ↓
Verify
  ↓
Document
  ↓
Next Phase
```

**未获得用户确认前，不进入下一阶段的实现。**

------------------------------------------------------------------------

# 9. Current Next Step

当前 **Phase 10（Observability & Intelligence Plane）已完成**。

- 「现在弄了什么 / 没弄什么 / 都做过什么」→ 见 **§2 现状总览**
- 未来完整计划与安全边界 → 见 **§5 未来路线图**

**建议的下一步（按优先级）：**

1. **Robotics 真实后端接入** —— 目前 `/robotics` 整页为演示数据。
2. **Data Center 真实存储接入** —— 目前 `/data-center` 整页为演示数据（2TB 数据层）。
3. **Execution Plane（执行面）** —— 命令 / Docker / Agent 驱动，需先满足 §5 的鉴权 / 权限 / 审计边界。
4. **细节打磨** —— 补齐 `docs/USER_GUIDE.md` 中标注「演示数据」的内容（机器人 / 存储 / 任务）。

详细使用见 `docs/USER_GUIDE.md`；Phase 10 汇报见 `docs/phase-10-report.md`。

------------------------------------------------------------------------

# 10. Project Philosophy

这个项目不是：

> 一个漂亮的 Dashboard。

也不是：

> 一个远程 Terminal。

最终目标是：

> **一个属于个人开发者的 Local-first Personal Research Operating
> System。**

iPad 是它的：

> **Control Surface**

Mac / Mac Studio / Server 是它的：

> **Compute & Execution Infrastructure**

Agent 是它的：

> **Cognitive / Automation Layer**

2TB SSD 是它的：

> **Personal Data Layer**

最终形成：

``` text
                    Personal Research OS
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
      Control Plane     Cognitive Layer    Data Layer
          │                 │                 │
          ▼                 ▼                 ▼
        Nodes             Agents             SSD
        Projects          Sessions           Datasets
        Research          Activities         Models
        Robotics          Workflows           Memory
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                     Execution Plane
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
           Mac           Mac Studio       Server
```
