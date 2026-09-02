# Silence Personal Control Center

## Phase 1 — System Architecture

**Project:** Silence Personal Control Center
**Version:** v0.1
**Phase:** Phase 1 — 总体架构设计
**Status:** Architecture Draft
**Date:** 2026-09-02

---

# 1. 文档目的

本文档定义 `Silence Personal Control Center v0.1` 的总体系统架构。

本阶段不进行具体业务功能开发，重点确定：

* 客户端技术路线
* Backend 架构
* Node 架构
* API 与通信机制
* 数据存储
* 网络架构
* Authentication / Authorization
* Command System
* Event System
* Project / Agent / Service / Node 数据抽象
* 未来 Mac Studio / GPU Server 扩展方式
* v0.1 MVP 边界

本文档属于 **Architecture v0.1 Draft**。

后续 Phase 可以根据实际开发结果修改本架构，但任何重大架构变化都应该记录原因和影响。

---

# 2. 项目定位

Silence Personal Control Center 不是单纯的：

> Remote Mac Dashboard

而是一个逐渐发展为：

> **Personal Research Operating System**

的个人开发者基础设施。

其核心职责是：

```text
Observe
    ↓
Understand
    ↓
Control
    ↓
Coordinate
    ↓
Automate
```

第一阶段只实现前三部分中的基础能力：

```text
Observe
Control
```

并为未来：

```text
Coordinate
Automate
```

预留架构。

---

# 3. 长期目标

最终系统希望形成：

```text
                         iPad Air
                            │
                            ▼
                  ┌──────────────────┐
                  │ Personal Control │
                  │      Center      │
                  └────────┬─────────┘
                           │
                     Control Plane
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      MacBook          Mac Studio       GPU Server
       Node #01         Node #02         Node #03
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                  Personal Data Center
                           │
                           ▼
                         2TB SSD
```

长期能力包括：

* Coding Agent
* Research Agent
* Robotics Agent
* Data Agent
* Experiment Management
* Dataset Management
* Model Management
* Remote Compute Management
* Local AI
* Personal Memory
* Second Brain
* Infrastructure Monitoring

但是这些能力不属于 v0.1 的实现范围。

---

# 4. 当前设备

## 4.1 MacBook Pro

当前第一计算节点。

```text
Model:
MacBook Pro

Chip:
Apple M3 Pro

CPU:
12 cores
6 Performance + 6 Efficiency

Memory:
36 GB

OS:
macOS 15.7.3

Architecture:
arm64
```

MacBook 当前承担：

* 主要开发
* Docker
* Python
* Web Development
* AI Agent
* Second Brain
* MuJoCo
* Robotics
* Git
* SSH
* 本地服务

在 Control Center 中：

> MacBook 是 `Node #01`。

---

# 5. iPad 定位

iPad Air M4 是本项目的核心客户端。

其定位不是：

```text
Compute Node
```

而是：

```text
Control Surface
```

即：

> Personal Control Center 的主要人机交互界面。

主要职责：

* Dashboard
* System Monitoring
* Project Monitoring
* Agent Monitoring
* Research Monitoring
* Robotics Monitoring
* Data Center Monitoring
* Command Execution
* Activity Timeline

计算密集型任务仍然由 Mac / Server 执行。

---

# 6. Mac Studio 的未来定位

未来可能购置 Mac Studio Max。

它不应该导致系统架构重构。

设计目标：

```text
MacBook
Node #01

Mac Studio
Node #02
```

两者使用统一的 Node Protocol。

例如：

```text
iPad
  ↓
Control Center
  ↓
Node #02
  ↓
Mac Studio
```

未来 Mac Studio 可以承担：

* Local AI
* Docker
* Model Serving
* Research
* Data Processing
* Agent Runtime
* Robotics Simulation

---

# 7. GPU Server 的未来定位

未来可能加入 Linux GPU Server：

```text
Node #03
```

例如：

```text
GPU Server
├── CUDA
├── PyTorch
├── RL Training
├── MuJoCo
├── GMR
├── GVHMR
└── Dataset Processing
```

Control Center 不应该直接针对 Linux 编写特殊业务逻辑。

应该通过：

```text
Node
+
Capability
+
Command
```

统一管理。

---

# 8. 总体架构

系统采用：

> **Web/PWA + Control Center Backend + Node Agent**

总体架构：

```text
┌─────────────────────────────────────────────────────┐
│                    iPad Air M4                      │
│                                                     │
│              Safari / PWA                           │
│                                                     │
│  Dashboard │ Projects │ Agents │ Research           │
│  Robotics │ Data │ Nodes │ Activity                 │
└───────────────────────┬─────────────────────────────┘
                        │
                   HTTPS / SSE
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                 MacBook Pro M3 Pro                  │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │              Control Center Backend             │ │
│ │                                                 │ │
│ │ REST API                                       │ │
│ │ SSE / WebSocket                                │ │
│ │ Authentication                                 │ │
│ │ Authorization                                  │ │
│ │ Command Router                                 │ │
│ │ Event System                                   │ │
│ │ Node Registry                                  │ │
│ └───────────────────────┬─────────────────────────┘ │
│                         │                           │
│ ┌───────────────────────▼─────────────────────────┐ │
│ │                Local Node Agent                 │ │
│ │                                                 │ │
│ │ System Monitor                                 │ │
│ │ Process Manager                                │ │
│ │ Docker Adapter                                 │ │
│ │ Git Adapter                                    │ │
│ │ Power Adapter                                  │ │
│ │ Service Adapter                                │ │
│ │ File Adapter                                   │ │
│ └─────────────┬─────────────┬────────────────────┘ │
│               │             │                       │
│               ▼             ▼                       │
│             macOS         Docker                    │
│             System        Services                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 9. 核心架构原则

## 9.1 iPad 是 Client

iPad 不直接控制 macOS。

错误架构：

```text
iPad
  ↓
Shell Command
  ↓
macOS
```

正确架构：

```text
iPad
  ↓
API
  ↓
Control Center
  ↓
Command
  ↓
Node Agent
  ↓
macOS
```

---

# 9.2 MacBook 是 Node，而不是整个系统

MacBook 是：

```text
Node #01
```

不是：

```text
Control Center = MacBook
```

这样未来可以增加：

```text
Node #02
Node #03
Node #04
```

而无需重构核心架构。

---

# 9.3 OS-specific 能力放入 Agent

macOS 特有操作不应该进入核心 Backend。

例如：

```text
Backend
    ↓
Power Command
    ↓
Node Agent
    ↓
macOS Power Adapter
```

而不是：

```text
Backend
    ↓
pmset
```

这样未来 Linux / Windows 可以实现不同 Adapter。

---

# 9.4 Capability First

每个 Node 声明自己的能力。

例如：

```text
MacBook
├── system_metrics
├── docker
├── git
├── sleep
├── wake
└── terminal
```

Linux GPU Server：

```text
GPU Server
├── system_metrics
├── docker
├── gpu
├── training
├── ssh
└── terminal
```

Frontend 根据 Capability 决定显示哪些功能。

---

# 10. Node Model

Node 是系统最重要的基础抽象之一。

逻辑结构：

```text
Node
├── identity
├── platform
├── architecture
├── hardware
├── status
├── capabilities
├── metrics
├── services
└── last_seen
```

示例：

```json
{
  "id": "macbook-pro-m3-pro",
  "name": "MacBook Pro",
  "platform": "macos",
  "architecture": "arm64",
  "status": "online",
  "capabilities": [
    "system_metrics",
    "docker",
    "git",
    "sleep",
    "wake"
  ]
}
```

---

# 11. Capability System

Capability 表示 Node 支持的能力。

示例：

```text
system_metrics
docker
git
sleep
wake
terminal
gpu
training
simulation
```

Frontend 不应该假设某项能力一定存在。

应该：

```text
if capability exists:
    expose feature
```

例如：

```text
MacBook
    sleep = available

GPU Server
    training = available
```

UI 自动根据 Node Capability 调整。

---

# 12. Service Model

Service 表示 Node 上运行的服务。

例如当前 Mac：

```text
MacBook
│
├── Docker
│   └── SearXNG
│
├── Second Brain
│
└── Control Center
```

Service：

```text
Service
├── id
├── name
├── node_id
├── type
├── status
├── health
├── endpoint
└── capabilities
```

Service 类型可以包括：

```text
docker
process
systemd
launchd
application
custom
```

具体实现根据平台决定。

---

# 13. Project Model

Project 与 Service 分离。

Project 表示开发 / 科研项目。

例如：

```text
Second Brain
G1
N2
GMR
GVHMR
Research
```

Project：

```text
Project
├── repository
├── branch
├── commit
├── tasks
├── sessions
├── services
└── experiments
```

未来可以将 Project 与：

* Git
* Agent
* Experiment
* Dataset
* Service

关联。

---

# 14. Agent Model

Agent 是独立于具体模型和具体项目的抽象。

第一阶段预留：

```text
Coding Agent
Research Agent
Robotics Agent
Data Agent
Review Agent
```

Agent：

```text
Agent
├── id
├── name
├── status
├── current_task
├── session
├── node
└── activity
```

Agent 不与某个具体模型绑定。

例如：

```text
Coding Agent
├── Codex
├── Claude Code
├── DeepSeek Harness
└── Future Local Model
```

Control Center 只负责：

> Observe / Monitor / Control

而不是在 v0.1 实现完整 Agent Runtime。

---

# 15. Command System

Command 是 Control Center 的控制机制。

基本模型：

```text
Command
├── command_id
├── node_id
├── target
├── action
├── parameters
├── requester
├── created_at
└── status
```

例如：

```text
node:
    macbook-pro-m3-pro

target:
    power

action:
    sleep
```

执行链：

```text
iPad
 ↓
POST /commands
 ↓
Control Center
 ↓
Command Router
 ↓
Node Agent
 ↓
Power Adapter
 ↓
macOS
```

---

# 16. Power Control

本项目明确：

> 不执行远程关机。

v0.1 只提供：

```text
Sleep
```

未来可以根据实际需求增加：

```text
Wake
Restart
```

但：

```text
Shutdown
```

不属于当前目标。

---

# 17. Command Security

v0.1 禁止开放任意 Shell。

不允许：

```text
POST /execute

{
    "command": "rm -rf ..."
}
```

应该使用明确的 Command Allowlist：

```text
power.sleep
docker.start
docker.stop
service.restart
git.status
system.refresh
```

这样可以降低远程控制风险。

未来如果需要 Terminal：

```text
Terminal Session
```

必须设计独立的：

* Authentication
* Authorization
* Session Management
* Audit Log
* Command Execution Policy

---

# 18. Event System

Command 表示：

> 想做什么。

Event 表示：

> 实际发生了什么。

例如：

```text
Command
    ↓
power.sleep
```

执行后：

```text
Event
    ↓
MacSleepStarted
```

完成：

```text
MacSleepCompleted
```

恢复：

```text
MacWake
```

Activity Timeline 可以基于 Event 构建：

```text
13:01  Mac Online
13:02  Docker SearXNG Running
13:05  Coding Agent Started
13:20  Training Started
13:45  Mac Sleep
15:10  Mac Wake
```

---

# 19. REST API

REST 用于：

```text
GET /nodes
GET /nodes/{id}

GET /projects
GET /projects/{id}

GET /agents
GET /agents/{id}

GET /services
GET /services/{id}

GET /metrics

GET /events
```

控制操作：

```text
POST /commands
```

---

# 20. SSE

实时状态优先采用：

> Server-Sent Events

用于：

```text
CPU
RAM
Storage
Docker
Agent Activity
Training Status
Node Status
```

数据流：

```text
Node Agent
    ↓
Backend
    ↓
SSE
    ↓
iPad
```

SSE 适合主要由 Server 向 Client 推送的状态数据。

---

# 21. WebSocket

WebSocket 不作为 v0.1 的主要通信机制。

未来主要用于：

```text
Terminal
Live Logs
Interactive Agent Session
Interactive Control
```

即：

```text
REST
    = Request / Response

SSE
    = Server → Client Events

WebSocket
    = Interactive Bidirectional Communication
```

---

# 22. Database

v0.1 使用：

> SQLite

原因：

* Local-first
* 单用户
* 部署简单
* 不需要额外数据库服务
* 容易备份
* 资源消耗低

逻辑：

```text
Control Center
      │
      ▼
    SQLite
```

v0.1 不依赖：

```text
PostgreSQL
Firebase
Supabase
AWS
```

未来如果系统规模需要，可以迁移 PostgreSQL。

---

# 23. Storage Architecture

Mac 内部 SSD：

```text
Control Center
├── Runtime
├── SQLite
├── Config
└── Cache
```

未来 2TB SSD：

```text
Personal AI Data Center
│
├── datasets
├── models
├── papers
├── videos
├── experiments
├── checkpoints
├── artifacts
├── sessions
├── memory
└── backups
```

Control Center 不应该在 v0.1 直接接管整个文件系统。

第一阶段只需要读取：

```text
Storage Capacity
Used
Free
```

以及后续实现分类统计。

---

# 24. 2TB SSD 的架构定位

2TB SSD 是：

> Personal Data Layer

而不是：

> Control Center Runtime Layer

这样可以避免：

```text
Control Center
    ↓
强依赖外置 SSD
```

如果 SSD 暂时没有连接：

```text
Control Center
```

仍然应该正常运行。

只有：

```text
Data Center Module
```

进入 degraded state。

---

# 25. Network Architecture

## 局域网

第一阶段：

```text
iPad
 │
 │ Wi-Fi
 ▼
MacBook
 │
 ▼
Control Center
```

---

# 26. Remote Network

未来使用：

> Tailscale

结构：

```text
iPad
 │
 │ Tailscale
 ▼
MacBook
```

多节点：

```text
                     Tailscale
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       MacBook        Mac Studio     GPU Server
       Node #01       Node #02       Node #03
```

Tailscale 属于：

> Network Infrastructure Layer

而不是 Application Layer。

---

# 27. 公网安全原则

禁止：

```text
Internet
    ↓
FastAPI :8000
```

直接暴露。

未来远程访问必须经过：

```text
VPN / Tailscale
        ↓
Authentication
        ↓
Authorization
        ↓
Control Center
```

---

# 28. Authentication

v0.1 至少需要：

```text
Authentication
```

不能假设：

> “因为在局域网，所以不需要认证。”

权限模型预留：

```text
Viewer
Operator
Admin
```

v0.1 可以简化为：

```text
Owner
```

但 API 和数据库模型应该避免以后无法扩展权限。

---

# 29. Authorization

权限至少应该区分：

```text
Read
    ↓
Observe

Write
    ↓
Control
```

例如：

Viewer：

```text
Dashboard
Projects
Metrics
Logs
```

Operator：

```text
Start
Stop
Restart
Sleep
```

Admin：

```text
Node Registration
Service Configuration
Security Configuration
```

---

# 30. Frontend Architecture

推荐：

```text
React
+
Next.js
+
TypeScript
```

UI：

```text
Tailwind CSS
```

PWA：

```text
Web App Manifest
Service Worker
Install to Home Screen
```

建议结构：

```text
apps/
└── web/
    ├── app/
    ├── components/
    ├── features/
    │   ├── dashboard/
    │   ├── nodes/
    │   ├── projects/
    │   ├── agents/
    │   ├── research/
    │   ├── robotics/
    │   └── data/
    ├── lib/
    └── hooks/
```

---

# 31. Backend Architecture

Backend：

> FastAPI

Python 包管理：

> uv

建议：

```text
apps/
└── api/
    ├── app/
    │   ├── api/
    │   ├── core/
    │   ├── models/
    │   ├── services/
    │   ├── commands/
    │   ├── events/
    │   ├── nodes/
    │   └── adapters/
    ├── tests/
    └── pyproject.toml
```

---

# 32. Node Agent Architecture

Node Agent 独立于 Backend。

建议：

```text
packages/
└── node-agent/
    ├── core/
    ├── adapters/
    │   ├── macos/
    │   ├── docker/
    │   ├── git/
    │   └── system/
    ├── metrics/
    ├── commands/
    └── tests/
```

核心原则：

```text
Core
    ↓
Platform Adapter
    ↓
Operating System
```

---

# 33. Repository Architecture

建议最终：

```text
silence-personal-control-center/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── node-agent/
│   ├── shared-types/
│   └── ui/
│
├── data/
│
├── docs/
│   ├── phase-0-environment-audit.md
│   ├── architecture.md
│   ├── api.md
│   └── security.md
│
├── scripts/
│
├── tests/
│
├── docker/
│
├── .env.example
├── README.md
└── package.json
```

该结构是目标结构。

Phase 2/3 初始化项目时，可以根据实际技术选择进行调整。

---

# 34. 技术栈决策

| Layer                  | Technology       |
| ---------------------- | ---------------- |
| Client                 | iPad Safari      |
| App Model              | PWA              |
| Frontend               | React + Next.js  |
| Language               | TypeScript       |
| UI                     | Tailwind CSS     |
| Backend                | FastAPI          |
| Backend Language       | Python           |
| Python Package Manager | uv               |
| API                    | REST             |
| Realtime State         | SSE              |
| Interactive Realtime   | WebSocket        |
| Database               | SQLite           |
| Node Agent             | Python           |
| Container              | Docker（可选）       |
| Local Network          | LAN              |
| Remote Network         | Tailscale        |
| Authentication         | Session / Token  |
| Storage                | Local Filesystem |

---

# 35. 为什么选择 PWA

第一阶段选择：

> Web/PWA

而不是 Native iPadOS App。

原因：

### 1. 开发成本低

可以快速完成 UI 和 Backend 联调。

### 2. 多设备复用

同一个 Client 可以运行在：

```text
iPad
Mac
iPhone
```

### 3. 与 Local Backend 配合自然

```text
iPad
 ↓
HTTPS
 ↓
Mac
```

### 4. 后续可以原生化

如果未来出现：

* Push Notification
* Background Tasks
* Widget
* 更深度系统集成
* Apple Pencil
* 原生多窗口

再考虑：

```text
SwiftUI
```

而 Backend/API 可以继续复用。

---

# 36. 为什么不选择 SwiftUI

SwiftUI 原生体验优秀，但 v0.1 阶段：

* 开发成本更高
* 需要 Xcode / Signing
* 当前需求并不依赖大量 iPadOS 原生 API
* Web API 本身已经可以满足主要控制需求

因此暂不选择。

---

# 37. 为什么不选择 React Native

React Native 可以实现跨平台 App。

但是当前：

```text
iPad
Mac
未来 iPhone
```

已经可以由 PWA 覆盖。

React Native 会引入额外：

* Native Build
* Xcode
* Signing
* Native Bridge

当前阶段收益不足。

---

# 38. 为什么不选择 Tauri

Tauri 更适合：

> Desktop Application

而当前第一客户端：

> iPad

因此不作为 v0.1 主客户端技术。

未来可以单独制作：

```text
Mac Desktop Client
```

---

# 39. Docker 定位

Docker 不是 Control Center 的硬性依赖。

开发阶段：

```text
Mac
 ↓
uv
 ↓
FastAPI
```

可以直接运行。

如果未来需要：

```text
Docker
 ↓
Control Center
```

再进行容器化。

这样不会为了 Control Center 强制改变当前 Mac 的开发环境。

---

# 40. Dashboard v0.1

Dashboard 第一版重点是：

> 一眼知道“我的计算环境现在怎么样”。

目标 UI：

```text
┌────────────────────────────────────────────┐
│ Silence Control Center                    │
│                                            │
│ MacBook Pro                  ● Online      │
│ M3 Pro · 36GB                              │
│                                            │
│ CPU       RAM        Storage      Docker   │
│ 24%       48%        103GB        ●        │
│                                            │
├────────────────────────────────────────────┤
│ Projects                                   │
│                                            │
│ Second Brain       ● Active                │
│ G1 MechDance       ● Ready                 │
│ N2                 ○ Idle                  │
│                                            │
├────────────────────────────────────────────┤
│ Agent Activity                             │
│                                            │
│ Coding Agent       Idle                    │
│ Research Agent     Idle                    │
│                                            │
├────────────────────────────────────────────┤
│ Recent Activity                            │
│                                            │
│ 13:20  SearXNG Running                     │
│ 13:05  Mac Online                          │
│                                            │
└────────────────────────────────────────────┘
```

---

# 41. iPad UI 原则

UI 应该：

* Dark Mode 优先
* 横屏优先
* Touch-first
* 大触控区域
* 信息密度适中
* Card-based
* 实时状态
* 清晰层级
* 快速操作

设计目标：

> 科研工作站 / Mission Control

而不是：

> 普通 Admin Dashboard

---

# 42. v0.1 MVP

## 必须实现

### Node

```text
Mac Online / Offline
CPU
RAM
Storage
OS
```

### Docker

```text
Running
Stopped
Container Status
```

### Projects

```text
Project List
Git Branch
Git Status
Last Commit
```

### Agents

```text
Agent Status
Current Task
Recent Activity
```

### Power

```text
Sleep
```

### Activity

```text
Recent Events
```

---

# 43. v0.1 明确不实现

以下功能暂不进入 MVP：

```text
完整 Coding Agent
完整 Research Agent
Agent Orchestration
Remote GPU Training Control
TensorBoard Integration
完整 File Manager
Dataset Manager
Paper Manager
Second Brain 深度集成
Multi-user
Cloud Database
Native iPad App
复杂自动化
公网直接暴露
任意 Shell Execution
```

---

# 44. Second Brain 集成原则

当前已有：

```text
Second Brain for Silence
```

该项目仍在维护。

本阶段：

> 不修改 Second Brain。

在未来进行集成之前必须：

1. 读取项目结构
2. 理解现有架构
3. 理解 API
4. 理解 Memory
5. 理解 Event
6. 理解 Pipeline
7. 分析可复用组件
8. 再设计集成方式

禁止直接将 Second Brain 代码复制进 Control Center。

---

# 45. 开源项目复用原则

优先复用成熟组件，但避免：

> 拼装大量第三方系统。

候选能力包括：

```text
Monitoring
Docker Management
Terminal
File Browser
Git
Authentication
Metrics
```

评估标准：

```text
成熟度
维护状态
License
安全性
API 能力
集成成本
数据控制权
```

如果自己实现成本很低，则优先自己实现。

---

# 46. Security Boundary

系统安全边界：

```text
┌─────────────────────────────┐
│ iPad                        │
│                             │
│ UI                          │
└──────────────┬──────────────┘
               │
             HTTPS
               │
┌──────────────▼──────────────┐
│ Control Center API          │
│                             │
│ Authentication              │
│ Authorization               │
│ Command Validation          │
└──────────────┬──────────────┘
               │
         Internal Protocol
               │
┌──────────────▼──────────────┐
│ Node Agent                  │
│                             │
│ Capability Validation       │
│ Command Allowlist           │
└──────────────┬──────────────┘
               │
               ▼
          macOS / Docker
```

---

# 47. 关键安全原则

禁止：

```text
公网裸露 FastAPI
```

禁止：

```text
任意 Shell API
```

禁止：

```text
sudo password
```

进入代码。

禁止：

```text
SSH Private Key
```

进入 Git Repository。

禁止未经确认：

```text
自动修改 macOS 系统配置
```

禁止未经确认：

```text
自动修改现有 Docker 环境
```

---

# 48. Phase 1 后的完整路线图

当前规划：

```text
Phase 0
Environment & Capability Audit
        ↓
Phase 1
System Architecture
        ↓
Phase 2
UI / UX Prototype
        ↓
Phase 3
Project Bootstrap & Development Infrastructure
        ↓
Phase 4
Mac Node Agent
        ↓
Phase 5
Control Center Backend
        ↓
Phase 6
Dashboard
        ↓
Phase 7
Projects & Git
        ↓
Phase 8
Services & Docker
        ↓
Phase 9
Power / Sleep / Wake
        ↓
Phase 10
Agent Monitor
        ↓
Phase 11
Research Module
        ↓
Phase 12
Robotics Module
        ↓
Phase 13
Personal Data Center / 2TB SSD
        ↓
Phase 14
Security Hardening
        ↓
Phase 15
Remote Access / Tailscale
        ↓
Phase 16
PWA / iPad Optimization
        ↓
Phase 17
Integration Testing
        ↓
Phase 18
Deployment
        ↓
Phase 19
Documentation
```

该路线图不是最终不可修改版本。

---

# 49. Phase 1 → Phase 2

Phase 1 完成后，下一阶段：

> **Phase 2 — UI / UX Prototype**

Phase 2 不直接开发 Backend。

首先设计：

```text
Design System
        ↓
Navigation
        ↓
Dashboard
        ↓
Node Detail
        ↓
Projects
        ↓
Agents
        ↓
Activity
        ↓
Research
        ↓
Robotics
        ↓
Data Center
```

最终获得：

> 可在 iPad 上操作的 Control Center UI Prototype。

---

# 50. Phase 1 完成标准

Phase 1 满足以下条件即可视为完成：

* [x] 确定 iPad 客户端路线
* [x] 确定 PWA 为 v0.1 客户端
* [x] 确定 React / Next.js / TypeScript
* [x] 确定 FastAPI Backend
* [x] 确定 Node Agent 架构
* [x] 确定 Node 抽象
* [x] 确定 Capability 抽象
* [x] 确定 Service 抽象
* [x] 确定 Project 抽象
* [x] 确定 Agent 抽象
* [x] 确定 Command System
* [x] 确定 Event System
* [x] 确定 REST API
* [x] 确定 SSE
* [x] 预留 WebSocket
* [x] 确定 SQLite
* [x] 确定 Local-first 原则
* [x] 确定 2TB SSD 的长期定位
* [x] 确定 Tailscale 的长期定位
* [x] 确定 Authentication / Authorization 原则
* [x] 确定 Sleep 而非 Shutdown
* [x] 确定 v0.1 MVP
* [x] 明确 v0.1 不做的内容
* [x] 设计未来 Mac Studio / GPU Server 扩展方式

---

# 51. Phase 1 最重要的架构结论

本项目的核心架构可以浓缩为：

```text
                         iPad
                          │
                       PWA/Web
                          │
                        HTTPS
                          │
                          ▼
               ┌────────────────────┐
               │   Control Center   │
               │      Backend       │
               │                    │
               │ API                │
               │ Auth               │
               │ Command Router     │
               │ Event System       │
               │ Node Registry      │
               └─────────┬──────────┘
                         │
                    Node Protocol
                         │
             ┌───────────┼────────────┐
             ▼           ▼            ▼
          MacBook     Mac Studio    GPU Server
          Agent         Agent         Agent
             │           │            │
             ▼           ▼            ▼
           macOS       macOS         Linux
             │           │            │
          Docker      Docker        Docker
             │
        Local Services
             │
       ┌─────┼─────────┐
       ▼     ▼         ▼
    Second  SearXNG   Agents
    Brain
             │
             ▼
          2TB SSD
```

核心思想：

> **iPad 负责控制，Node 负责执行，Backend 负责协调，2TB SSD 负责数据。**

---

# 52. 架构冻结状态

当前状态：

```text
Phase 0
████████████████████ 100%  Environment Audit

Phase 1
████████████████████ 100%  Architecture Draft

Phase 2
░░░░░░░░░░░░░░░░░░░░   0%  UI / UX Prototype
```

当前 Architecture 状态：

> **Draft / 可修改**

在 Phase 2 开始之前，不应创建大量实际代码。

下一阶段的主要任务是：

> **把这套架构转化为一个真正适合 iPad 13-inch 横屏触控操作的 Control Center UI。**

---

# Appendix A — Architecture Decision Summary

| Decision    | Choice          | Reason                       |
| ----------- | --------------- | ---------------------------- |
| Client      | PWA             | 跨设备、低成本                      |
| Frontend    | React + Next.js | Web 生态成熟                     |
| Language    | TypeScript      | 类型安全                         |
| Backend     | FastAPI         | Python 生态适合科研环境              |
| Node        | 独立 Agent        | 支持多节点                        |
| Database    | SQLite          | Local-first                  |
| API         | REST            | 简单可靠                         |
| Realtime    | SSE             | 适合状态推送                       |
| Interactive | WebSocket       | 为 Terminal 等未来功能预留           |
| Network     | LAN             | 第一阶段简单                       |
| Remote      | Tailscale       | 安全远程连接                       |
| Storage     | Local FS        | 数据控制权                        |
| 2TB SSD     | Data Layer      | Dataset / Model / Experiment |
| Power       | Sleep           | 避免远程关机                       |
| Shell       | 禁止任意执行          | 安全                           |
| Cloud       | 暂不依赖            | Local-first                  |
| Native App  | 暂不开发            | MVP 成本过高                     |

---

# Appendix B — v0.1 Architecture Principle

整个系统应该始终遵守：

```text
                    PERSONAL CONTROL CENTER

                             │
                     ┌───────┴───────┐
                     │               │
                  Observe          Control
                     │               │
                     ▼               ▼
                   Node           Command
                     │               │
                     └───────┬───────┘
                             │
                        Event System
                             │
                             ▼
                      Personal Memory
                             │
                             ▼
                       Future Agents
```

最终目标不是做一个 Dashboard。

最终目标是建立：

> **Silence 的 Personal Control Plane。**

v0.1 只是这个系统的第一个可用版本。
