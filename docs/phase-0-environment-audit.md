# Silence Personal Control Center

## Phase 0 — Environment & Capability Audit

**Project:** Silence Personal Control Center
**Version:** v0.1
**Phase:** Phase 0
**Status:** ✅ Completed
**Audit Date:** 2026-09-02
**Primary Host:** MacBook Pro M3 Pro
**Target Client:** iPad Air 13-inch M4

---

# 1. Phase 0 Overview

Phase 0 的目标不是开发 Control Center，而是：

> **全面审计现有硬件、操作系统、开发环境、Docker、本地项目、网络以及 Sleep/Wake 能力，为后续架构设计提供真实环境依据。**

本阶段遵循：

```text
检查现有环境
      ↓
确认能力
      ↓
识别限制
      ↓
识别风险
      ↓
形成架构约束
      ↓
进入 Phase 1
```

本阶段：

* 不修改现有项目
* 不重构现有环境
* 不安装非必要软件
* 不修改 macOS 电源参数
* 不修改 Docker 服务
* 不修改 Second Brain
* 不实现 Control Center 功能

---

# 2. Audit Scope

本次 Phase 0 包含以下审计：

```text
Phase 0-A
Hardware / macOS

Phase 0-B
Development Environment

Phase 0-C
Docker / Local Services

Phase 0-D
Network

Phase 0-E
Sleep / Wake

Phase 0-F
Projects / Services
```

---

# 3. Hardware & macOS

## 3.1 MacBook Pro

| 项目                | 当前值                   | 状态 |
| ----------------- | --------------------- | -- |
| Model             | MacBook Pro           | ✅  |
| Model Identifier  | Mac15,7               | ✅  |
| Chip              | Apple M3 Pro          | ✅  |
| CPU               | 12 cores              | ✅  |
| Performance Cores | 6                     | ✅  |
| Efficiency Cores  | 6                     | ✅  |
| Memory            | 36 GB                 | ✅  |
| macOS             | 15.7.3                | ✅  |
| Architecture      | Apple Silicon / ARM64 | ✅  |

该机器可以作为：

> **Control Center Backend / Control Plane 的第一台 Compute Node。**

同时继续承担现有开发工作：

* Python
* Web Development
* Docker
* AI Agent
* Robotics
* MuJoCo
* Git
* SSH
* Data Processing

---

# 4. Storage Audit

系统磁盘：

| 项目              |      数值 |
| --------------- | ------: |
| Filesystem Size | 460 GiB |
| Used            |  10 GiB |
| Available       | 103 GiB |
| Capacity        |     10% |
| Home Directory  | 203 GiB |

## 4.1 结论

当前磁盘空间**可以继续进行 v0.1 开发**。

但是：

> ⚠️ Storage 是后续需要重点处理的问题。

原因包括：

* Docker 镜像
* Docker Build Cache
* Python / Conda 环境
* Node modules
* Robotics 数据
* Model
* Dataset
* Video
* Experiment
* Checkpoint

均可能持续占用本地存储。

因此未来 2TB SSD 应作为：

> **Personal AI Data Center**

而不是简单作为普通外接硬盘。

## 4.2 当前决策

Phase 0：

> **不执行磁盘清理。**

后续单独建立：

```text
Storage Optimization
```

任务。

---

# 5. Development Environment

## 5.1 Homebrew

```text
Homebrew 4.6.3-58-g10b9da2
```

状态：

> ✅ Ready

---

## 5.2 Node.js

```text
Node v23.11.0
npm 11.19.1
pnpm 10.11.0
```

状态：

> ✅ Ready

未来 Frontend 可以优先考虑：

```text
React
Next.js
pnpm
```

无需重新安装 Node.js。

---

# 6. Python Environment

当前：

```text
Python 3.13.6
uv 0.11.27
Conda 26.3.2
```

状态：

> ✅ Ready

## 6.1 Control Center Python 策略

Control Center Backend 如果使用 Python：

> 优先使用 `uv` 管理独立环境。

不建议为了 Control Center 新建 Conda 环境。

原因：

Control Center 并非主要 Machine Learning 项目，而当前机器已经存在 Robotics / ML 环境。

目标：

```text
Robotics / ML
    ↓
Existing Conda / Python environments

Control Center
    ↓
Independent uv environment
```

以避免环境污染。

---

# 7. Git / SSH

## Git

```text
git version 2.49.0
```

状态：

> ✅ Ready

## SSH

```text
OpenSSH_9.9p2
LibreSSL 3.3.6
```

状态：

> ✅ Ready

SSH 将来可以用于：

```text
iPad
  ↓
Control Center
  ↓
Remote Node
  ↓
SSH
  ↓
GPU Server / Mac Studio / Linux Server
```

因此 SSH 是未来 Multi-Node Architecture 的重要基础能力。

Phase 0 不修改 SSH 配置。

---

# 8. Docker

## 8.1 Docker Version

```text
Docker 29.1.3
Docker Desktop
Context: desktop-linux
```

状态：

> ✅ Ready

---

# 9. Existing Docker Containers

当前 Docker 共存在：

```text
10 containers
```

状态：

```text
Running: 1
Stopped: 9
Paused: 0
```

## 9.1 Containers

| Container        | Status  |
| ---------------- | ------- |
| im-postgres      | Exited  |
| im-redis         | Exited  |
| im-mongodb       | Exited  |
| im-minio         | Exited  |
| booking-postgres | Exited  |
| booking-redis    | Exited  |
| searxng          | Running |
| es-server        | Exited  |
| cpms-neo4j       | Exited  |
| oracle23ai       | Exited  |

当前正在运行：

```text
searxng
```

端口：

```text
8080 → 8080
```

---

# 10. Docker Storage

当前 Docker Disk Usage：

| Type          |    Total | Reclaimable |
| ------------- | -------: | ----------: |
| Images        | 37.54 GB |    32.98 GB |
| Containers    | 6.728 GB |    6.727 GB |
| Local Volumes | 1.831 GB |    1.366 GB |
| Build Cache   |  10.3 GB |    8.267 GB |

Docker 当前存在明显的历史资源。

理论上存在大量可回收空间。

## 10.1 风险

这些资源可能属于：

* 以前的项目
* 数据库
* 实验环境
* 开发环境

因此不能仅根据 `reclaimable` 判断它们可以安全删除。

## 10.2 当前决策

禁止在 Phase 0 执行：

```bash
docker system prune
```

或：

```bash
docker system prune -a
```

除非后续单独完成 Docker 资源审计。

---

# 11. Existing Local Services

当前已确认存在本地服务体系。

其中：

```text
SearXNG
```

当前正在 Docker 中运行。

未来可以作为：

> Research Search Service

与：

```text
Research Agent
Paper Search
Web Research
Second Brain
```

进行集成。

但是：

> Phase 0 不修改 SearXNG。

---

# 12. Existing User Services

系统中存在用户级常驻服务，例如：

```text
Hermes Gateway
```

其通过 LaunchAgent 运行。

这说明当前 Mac 已经承担：

> Agent / Gateway / Local Service Host

角色。

因此 Control Center 不应该假设 Mac 是一台纯净的开发机。

未来架构必须：

> **兼容已有服务，而不是接管已有服务。**

---

# 13. Network

当前网络接口包括：

```text
Wi-Fi
en0
```

以及：

```text
Ethernet Adapter
Thunderbolt Bridge
Thunderbolt Interfaces
```

当前 Mac 具备正常的网络基础能力。

---

# 14. Tailscale

当前状态：

```text
Tailscale
NOT INSTALLED
```

## 14.1 当前决策

Phase 0：

> 不安装 Tailscale。

Phase 1 / Network Architecture 阶段再确定：

```text
LAN
        +
Tailscale
        +
HTTPS
```

的最终组合。

---

# 15. Sleep / Wake Audit

## 15.1 当前配置

当前关键参数：

```text
SleepDisabled = 0
standby       = 1
powernap      = 1
tcpkeepalive  = 1
networkoversleep = 0
womp          = 1 (AC)
sleep         = 1
hibernateMode = 3
```

说明：

> macOS 没有被禁止进入 Sleep。

---

# 16. Sleep / Wake 实际验证

系统日志已经记录了真实的 Sleep / Wake：

```text
Entering Sleep state
```

随后：

```text
Wake from Deep Idle
```

因此：

> ✅ macOS Sleep / Wake 功能正常。

---

# 17. Remote Wake

需要注意：

当前日志确认的是：

```text
Sleep
  ↓
Wake
```

但尚未证明：

```text
iPad
  ↓
Network
  ↓
Sleeping Mac
  ↓
Remote Wake
```

因此：

> 🟡 Remote Wake 尚未验证。

Phase 1 网络架构中必须单独验证该能力。

---

# 18. Power Architecture Decision

项目不采用：

```text
Mac
↓
Never Sleep
```

模式。

而采用：

```text
Mac Awake
    ↓
Full Control

Mac Sleep
    ↓
Low Power
```

未来 Control Center 应支持：

```text
iPad
  ↓
Control Center
  ↓
Mac
  ↓
Sleep
```

Wake 则需要依赖 macOS / 网络层提供的唤醒机制。

重要限制：

> Mac 进入 Sleep 后，普通 FastAPI 服务不能继续承担自身 Wake 的职责。

因此 Wake Architecture 必须独立设计。

---

# 19. Existing Projects

当前已经发现多个开发项目，包括但不限于：

```text
Second_brain_for_Silence
MechDance
dsh
coding-video
LUMO_GUIDE_BackendCode
LUMOGUIDE
lumotrip
linux_kali
```

这些项目说明：

> MacBook 已经是用户的主要开发工作站。

---

# 20. Second Brain

已有项目：

```text
Second_Brain_for_Silence
```

GitHub：

[Second Brain for Silence](https://github.com/Silence-313/Second_Brain_for_Silence.git?utm_source=chatgpt.com)

该项目目前仍在维护。

## 当前策略

Phase 0：

> **不修改 Second Brain。**

未来在 Integration Phase 中，必须首先：

1. 分析项目结构
2. 分析 API
3. 分析 Memory
4. 分析 Event
5. 分析 Pipeline
6. 分析运行方式
7. 再决定集成方式

禁止直接重构。

---

# 21. Robotics Projects

当前已有：

```text
MechDance
```

并且用户长期涉及：

```text
G1
N2
GMR
GVHMR
MuJoCo
RL
Motion Dataset
```

因此未来 Robotics Module 应该能够监控：

```text
Simulation
Training
Experiment
Dataset
Checkpoint
Logs
```

但：

> Phase 0 不修改 Robotics 项目。

---

# 22. Phase 0 Findings

综合审计得到以下关键发现。

## Finding 1 — Mac 足够承担第一版 Backend

M3 Pro + 36GB RAM 已满足 v0.1 开发需求。

---

## Finding 2 — 无需重新安装基础开发环境

当前已有：

```text
Node
pnpm
Python
uv
Conda
Git
SSH
Docker
```

因此不需要重复搭建开发环境。

---

## Finding 3 — Mac 已经是多用途开发节点

当前 Mac 同时承担：

```text
Development
Docker
AI Agent
Research
Robotics
Local Services
```

因此 Control Center 必须采用：

> **Non-invasive Architecture**

---

## Finding 4 — Docker 存在大量历史资源

Docker 当前有大量可回收空间。

但不能直接清理。

后续应单独处理。

---

## Finding 5 — Sleep 正常

macOS 可以正常进入 Sleep 并 Wake。

---

## Finding 6 — Remote Wake 尚未验证

这是后续 Network Architecture 的重要实验。

---

## Finding 7 — Tailscale 尚未部署

暂不安装。

---

## Finding 8 — 未来必须支持 Multi-Node

未来可能增加：

```text
MacBook Pro
Mac Studio
Remote GPU Server
Linux Server
```

因此 Control Center 不能设计成单机系统。

---

# 23. Architecture Constraints

Phase 0 最终形成以下架构约束。

## Constraint 1 — Local-first

优先：

```text
iPad
 ↓
Mac
 ↓
Local Services
 ↓
Local Storage
```

而不是：

```text
iPad
 ↓
Cloud SaaS
```

---

## Constraint 2 — Non-invasive

Control Center 不应破坏：

```text
Second Brain
Docker
Python
Conda
Robotics
MuJoCo
Git
SSH
```

---

## Constraint 3 — Multi-node Ready

架构必须允许：

```text
MacBook
Mac Studio
Remote Server
GPU Server
```

作为独立 Compute Node 加入。

---

## Constraint 4 — Sleep-aware

Mac 可以：

```text
Awake
Sleep
Wake
```

Control Center 必须知道 Node 当前状态。

---

## Constraint 5 — Security-first

禁止：

```text
FastAPI :8000
        ↓
Direct Public Internet
```

未来优先：

```text
HTTPS
Authentication
Authorization
Tailscale
```

---

## Constraint 6 — Read-first

第一版首先：

```text
Observe
Monitor
Inspect
```

然后才：

```text
Control
Execute
Modify
```

---

# 24. Phase 0 MVP Boundary

Phase 0 不开发以下内容：

```text
❌ Coding Agent
❌ Research Agent
❌ Robotics Agent
❌ Second Brain 重构
❌ 完整 File Manager
❌ 云端数据库
❌ Firebase
❌ Supabase
❌ AWS
❌ Kubernetes
❌ Remote GPU orchestration
❌ 自动 Docker 清理
❌ 自动系统优化
```

---

# 25. Phase 0 Completion Criteria

以下条件已经满足：

| Criteria                            | Status |
| ----------------------------------- | ------ |
| Hardware Audit                      | ✅      |
| macOS Audit                         | ✅      |
| Development Environment Audit       | ✅      |
| Docker Audit                        | ✅      |
| Existing Service Audit              | ✅      |
| Network Audit                       | ✅      |
| Sleep Audit                         | ✅      |
| Project Audit                       | ✅      |
| Risks Identified                    | ✅      |
| Architecture Constraints Identified | ✅      |
| Existing Environment Modified       | ❌      |
| Existing Projects Modified          | ❌      |

因此：

# Phase 0 = COMPLETE

---

# 26. Phase 1 Input

Phase 1 的设计输入正式确定为：

```text
Target Client
    ↓
iPad Air M4

Control Plane
    ↓
Web / PWA

Primary Compute Node
    ↓
MacBook Pro M3 Pro

Future Compute Nodes
    ↓
Mac Studio
Remote GPU
Linux Server

Backend
    ↓
Local-first

Data
    ↓
Local Storage
    ↓
Future 2TB SSD

Network
    ↓
LAN
    +
Future Tailscale

Communication
    ↓
REST
    +
SSE / WebSocket

Security
    ↓
Authentication
    +
Authorization

Power
    ↓
Sleep / Wake aware
```

---

# 27. Next Phase

下一阶段：

# Phase 1 — System Architecture

主要解决：

```text
PWA / Web / Native
        ↓
Frontend Architecture
        ↓
Backend Architecture
        ↓
Node Architecture
        ↓
Service Architecture
        ↓
Project Architecture
        ↓
Agent Architecture
        ↓
Command Architecture
        ↓
Event Architecture
        ↓
Security Architecture
        ↓
Network Architecture
        ↓
Storage Architecture
```

同时重点确保：

> **未来增加 Mac Studio 后无需重构核心系统。**

Phase 1 完成后才进入 UI Prototype 和代码实现。

---

# 28. Final Phase 0 Decision

最终结论：

> **Silence Personal Control Center v0.1 在当前 MacBook Pro M3 Pro 环境上具备开发条件。**

无需更换硬件。

无需重装系统。

无需重新安装 Node / Python / Docker。

无需立即安装 Tailscale。

无需修改 Second Brain。

无需修改 Docker。

无需修改 macOS Power Settings。

下一阶段应该直接进入：

> **Phase 1 — Overall System Architecture**

而不是继续进行无意义的环境配置。
