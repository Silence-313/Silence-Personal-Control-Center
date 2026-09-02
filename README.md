# Silence Personal Control Center v0.1

## 总体路线

```text
Phase 0
Environment & Capability Audit
        ↓
Phase 1
System Architecture
        ↓
Phase 2
UI/UX Prototype
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

---

# Phase 0 — 环境与能力审计

### 目标

回答一个最基本的问题：

> **我现在这台 Mac 到底能够为 Personal Control Center 提供什么？**

这一阶段**不写项目代码、不安装软件、不修改系统配置**。

### 审计内容

```text
Mac
├── macOS
├── CPU
├── RAM
├── Disk
├── Network
│
├── Homebrew
├── Node
├── npm / pnpm
├── Python
├── uv / Conda
├── Git
├── Docker
├── SSH
├── Tailscale
│
├── 当前端口
├── 当前运行服务
│
├── Sleep
├── Wake
└── Power Management
```

特别重要的是：

### Sleep / Wake

需要实际验证：

```text
Awake
 ↓
Sleep
 ↓
iPad / 网络
 ↓
Wake
 ↓
Mac Online
```

### 输出

```text
docs/
└── phase-0-environment-audit.md
```

### 完成标准

我们知道：

* 当前环境有什么
* 什么可以直接复用
* 什么缺失
* 什么需要安装
* Mac 能否可靠 Sleep/Wake
* 网络环境是否适合 Tailscale
* 哪些东西绝对不能动


### 结果

[Phase 0 汇报文档](docs/phase-0-environment-audit.md)

---

# Phase 1 — Architecture

这一阶段才正式确定技术路线。

### 需要确定

```text
Frontend
Backend
Database
Network
Authentication
Storage
Realtime
Device Manager
Adapter System
Deployment
```

最终形成：

```text
iPad
 ↓
PWA
 ↓
Tailscale
 ↓
Next.js
 ↓
FastAPI
 ↓
Control Plane
 ↓
Adapters
 ↓
Mac
```

### 输出

```text
docs/
├── architecture.md
├── api-design.md
├── data-model.md
└── security-design.md
```

### 完成标准

回答：

> **以后增加 Mac Studio、Linux Server、GPU Server 时是否需要重构？**

### 结果

[Phase 1 汇报文档](docs/phase-1-architecture.md)

---

# Phase 2 — UI / UX Prototype

这一阶段先**设计体验，不接真实后端**。

重点是：

> iPad 到底应该长什么样。

设计：

```text
Dashboard
Devices
Projects
Agents
Research
Robotics
Data Center
Activity
```

重点优化：

* 13" iPad 横屏
* Touch
* Dark Mode
* 信息密度
* Navigation
* Cards
* Status
* Command Center 风格

### 输出

```text
docs/
└── ui-design.md
```

以及可以直接运行的前端 prototype。

### 完成标准

拿 iPad 实际打开后：

> **看起来已经像一个真正可以使用的 Personal Control Center。**

---

# Phase 3 — Project Foundation

开始正式写代码。

建立：

```text
silence-personal-control-center/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   └── shared/
│
├── data/
│
├── docs/
├── scripts/
├── tests/
└── README.md
```

技术栈暂定：

```text
Next.js
React
TypeScript
FastAPI
Python
SQLite
Pydantic
WebSocket
```

### 完成标准

做到：

```text
iPad
 ↓
Next.js
 ↓
FastAPI
 ↓
API Response
```

跑通第一条链路。

---

# Phase 4 — Mac Control Plane

这是整个项目真正的核心。

建立：

```text
Mac
│
└── Control Plane
     │
     ├── System Adapter
     ├── Docker Adapter
     ├── Git Adapter
     ├── Storage Adapter
     ├── Power Adapter
     └── Network Adapter
```

其中：

### System

```text
CPU
RAM
Disk
Network
Uptime
```

### Docker

```text
Running
Stopped
Images
Containers
```

### Git

```text
Branch
Commit
Dirty
Ahead
Behind
```

### Power

```text
Awake
Sleeping
Wake
Sleep
```

---

# Phase 5 — Dashboard + Devices

这是第一个真正意义上的 MVP。

iPad：

```text
Dashboard

MacBook Pro M3
● Awake

CPU       23%
RAM       18.4GB
Storage   1.2TB
Docker    ●
Tailscale ●

[ Sleep ]
```

Devices：

```text
Devices

MacBook Pro M3
● Awake

[ Sleep ]
```

未来：

```text
MacBook Pro M3
Mac Studio M4 Max
Linux Server
```

全部使用统一 Device Model。

---

# Phase 6 — Projects + Agents

加入：

```text
Projects
```

例如：

```text
Second Brain
G1
N2
GMR
GVHMR
Research
```

以及：

```text
Agents
```

例如：

```text
Coding Agent
Research Agent
Robotics Agent
Data Agent
Review Agent
```

但这里依然：

> **监控优先，不开发 Agent 本体。**

尤其不要在这个 Phase 修改你的 Second Brain。

只做：

```text
Adapter
 ↓
读取状态
 ↓
Control Center
```

---

# Phase 7 — Research + Robotics

建立：

```text
Research
├── Papers
├── Projects
├── Experiments
├── Datasets
├── Notes
└── Reports
```

以及：

```text
Robotics
├── G1
├── N2
├── GMR
├── GVHMR
├── MuJoCo
├── RL
└── Motion Dataset
```

第一阶段主要做：

```text
Status
Experiment
Logs
Metrics
```

而不是直接远程控制机器人。

---

# Phase 8 — Personal AI Data Center

接入你的 2TB SSD。

设计：

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
├── agent
├── memory
└── backups
```

Dashboard：

```text
2TB SSD

Used     1.37TB
Free     630GB

Datasets       510GB
Models         320GB
Experiments    420GB
Papers          18GB
```

这个阶段才真正开始：

> **Storage Management**

---

# Phase 9 — Security + Remote Access + PWA

这一阶段进行安全加固。

### 网络

```text
LAN
 ↓
Tailscale
 ↓
HTTPS
```

### Security

```text
Authentication
Authorization
Session
API Security
CORS
Rate Limit
Audit Log
Command Permission
```

特别是：

```text
Sleep
Wake
Docker
Agent
Training
```

这些属于：

> **Control Operations**

不能像普通 GET API 一样裸奔。

---

### PWA

最终：

```text
Safari
 ↓
Add to Home Screen
 ↓
Silence Personal Control Center
```

---

# Phase 10 — Full Integration Test

测试整个系统：

```text
iPad
 ↓
Tailscale
 ↓
Web
 ↓
FastAPI
 ↓
Mac
 ↓
System / Docker / Git / Storage
```

测试：

### 正常流程

```text
Wake
 ↓
Online
 ↓
Services Ready
 ↓
Dashboard
```

### Sleep

```text
Dashboard
 ↓
Sleep
 ↓
Mac Sleeping
 ↓
Wake
 ↓
Online
```

### 网络

```text
LAN
Remote
Disconnect
Reconnect
```

### 异常

```text
Mac crash
FastAPI crash
Docker crash
Tailscale disconnect
Network interruption
```

---

# Phase 11 — Deployment + Documentation

最终形成：

```text
一键启动
一键停止
一键更新
```

并完成：

```text
README.md
ARCHITECTURE.md
DEPLOYMENT.md
SECURITY.md
TROUBLESHOOTING.md
API.md
```

最终别人即使不知道项目内部实现，也能理解它。

---

# 最终路线图

我把它压缩成一张图：

```text
                    Silence Personal Control Center
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 0         │
                         │ Environment     │
                         │ Audit           │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 1         │
                         │ Architecture    │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 2         │
                         │ UI/UX Prototype │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 3         │
                         │ Foundation      │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 4         │
                         │ Control Plane   │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 5         │
                         │ Dashboard       │
                         │ + Devices       │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 6         │
                         │ Projects        │
                         │ + Agents        │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 7         │
                         │ Research        │
                         │ + Robotics      │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 8         │
                         │ Data Center     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 9         │
                         │ Security/PWA    │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 10        │
                         │ Integration     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Phase 11        │
                         │ Deployment      │
                         │ + Documentation │
                         └─────────────────┘
```