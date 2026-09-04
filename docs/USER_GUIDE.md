# Silence Personal Control Center v0.1 — 使用指南

> 面向 iPad（控制面）+ Mac（计算/执行面）的个人科研操作系统控制台。
> 本文档说明**如何启动、连接、以及使用当前已实现（Phase 0–10）的全部功能**。

---

## 目录

1. [这是什么](#1-这是什么)
2. [系统架构一句话](#2-系统架构一句话)
3. [启动系统](#3-启动系统)
4. [首次连接与设备配对](#4-首次连接与设备配对)
5. [界面导览](#5-界面导览)
6. [各页面详解](#6-各页面详解)
7. [电源控制（睡眠 / 唤醒）](#7-电源控制睡眠--唤醒)
8. [实时性与状态含义](#8-实时性与状态含义)
9. [真实数据 vs 演示数据](#9-真实数据-vs-演示数据)
10. [配置说明](#10-配置说明)
11. [常见问题排查](#11-常见问题排查)
12. [安全与边界](#12-安全与边界)

---

## 1. 这是什么

Silence Personal Control Center 是一个 **Local-first（本地优先）** 的个人科研操作系统控制台：

```text
iPad（控制面 / Control Surface）
        │
        ▼
Next.js 前端（Web / PWA）
        │  REST + SSE
        ▼
FastAPI 后端（Control Plane）
        │
        ├── 节点 / 指标 / 服务 / 电源
        ├── 项目（Git 只读）
        ├── 智能体 / 会话
        ├── 研究（论文 / 项目 / 实验 / 数据集 / 笔记 / 报告）
        ├── 知识图谱 / 自动化
        └── 可观测性（历史 / 健康 / 时间线 / 运行）
        │
        ▼
Mac（计算与执行基础设施）
```

核心原则：**先观察、后执行（Read-only first）**。当前版本（v0.1）绝大部分是**只读监控**，
只开放了「屏幕睡眠 / 唤醒」这类低风险的执行能力。

---

## 2. 系统架构一句话

```text
iPad Safari / PWA  →  http://<Mac 的 IP>:3000  →  Next.js  →  FastAPI（:8000） →  SQLite + YAML
```

- **前端**：Next.js + React + TypeScript + Tailwind，默认监听 `3000` 端口。
- **后端**：FastAPI + SQLModel(SQLite)，默认监听 `8000` 端口。
- **通信**：REST（初始数据）+ SSE（实时推送），并带轮询兜底。
- **数据库**：SQLite（`backend/data/control-center.db`）。

---

## 3. 启动系统

### 3.1 启动后端（在 Mac 上）

```bash
cd Silence-Personal-Control-Center/backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

启动成功会看到 `Uvicorn running on http://0.0.0.0:8000`。

### 3.2 启动前端（在 Mac 上，另开一个终端）

```bash
cd Silence-Personal-Control-Center
pnpm dev
```

启动后会打印：

```text
- Local:   http://localhost:3000
- Network: http://<Mac 的 IP>:3000
```

### 3.3 在 iPad 上打开

1. 让 iPad 与 Mac 处于**同一个局域网 / Wi-Fi**。
2. 在 iPad Safari 打开 `http://<Mac 的 IP>:3000`（例如 `http://10.101.187.180:3000`）。
   - 也可以在 Mac 浏览器输入 `http://localhost:3000` 直接使用。
3. 建议用 Safari「添加到主屏幕」，获得接近原生 App 的全屏体验。

> 查看 Mac 当前局域网 IP：`ipconfig getifaddr en0`（或 `en1`）。

---

## 4. 首次连接与设备配对

系统对每个浏览器/设备做一次性授权。首次访问会进入配对页（PairingGate）。

### 4.1 配对步骤

1. iPad 打开页面，显示 **「Connect to this Mac? / 连接到此 Mac？」**，并展示一组 **设备码**
   （形如 `dev-xxxxxxxxxxxxxxxx`，由设备本地生成）。
2. 点击 **「Connect / 连接」**。
3. Mac 屏幕上会弹出 **「Silence 连接验证码」** 卡片，显示一个 **6 位数字验证码**
   （5 分钟内有效）。
4. 在 iPad 上输入这 6 位数字，点击 **「Verify / 验证」**。
5. 验证通过后，设备获得一个长期 `access_token`，自动进入工作台。

### 4.2 配对成功后

- `access_token` 保存在设备本地的 `localStorage`（`silence.access_token`）。
- 之后每次访问自动带 Bearer token，无需重复配对。
- 若 token 失效/被吊销（后端返回 401），前端会自动清空 token 并回到配对页。

### 4.3 重新配对 / 更换设备

- 在配对页点「Cancel / 取消」，再点「Reconnect / 重新连接」即可重新走配对流程。
- 想彻底重置某台设备：在该设备浏览器里清除 `silence.access_token`
  （以及 `silence.device_code`，可生成新设备码）。

### 4.4 找不到验证码时的兜底

`Mac 上没弹验证码` 时，验证码仍可从以下两处取得：

- **后端日志**：会打印 `PAIRING_CODE_ISSUED`，`code` 字段即 6 位验证码。
- **管理员接口**：`GET /api/v1/auth/pending`（需管理员 Bearer token），
  返回所有待验证的配对及其验证码。

---

## 5. 界面导览

侧边栏（iPad 上为顶部栏 + 抽屉）包含 10 个主页面：

| 页面 | 图标 | 中文 | 作用 |
|---|---|---|---|
| Dashboard | ▣ | 工作台 | 总览：节点、指标、电源、Docker、任务、最近活动 |
| Observability | 📈 | 可观测性 | 指标历史、健康评分、事件时间线、自动化运行 |
| Projects | 🗂 | 项目 | Git 仓库只读状态（分支 / 远端 / ahead/behind / 工作区） |
| Agents | 🤖 | 智能体 | 智能体注册表 + 详情 + 关联会话 |
| Sessions | ☰ | 会话 | 会话生命周期记录 |
| Research | ⚗ | 研究 | 论文 / 项目 / 实验 / 数据集 / 笔记 / 报告 |
| Robotics | 🖥 | 机器人 | 机器人、仿真、训练运行、实验（演示数据） |
| Data Center | 🗄 | 数据中心 | 2TB 数据层存储总览（演示数据） |
| Knowledge | 📚 | 知识 | 自动索引的知识图谱 + 自动化规则 |
| Activity | 🕒 | 活动 | 全系统统一事件时间线 |

右上角可切换**语言（中 / 英）**，偏好保存在本地。

---

## 6. 各页面详解

### 6.1 工作台（Dashboard）

登录后的默认首页，一页总览：

- **节点状态卡**：本地节点（默认 `macbook-pro`）的在线状态、最后心跳。
- **电源环按钮**：两个圆形按钮 **「Sleep / 睡眠」** 与 **「Wake / 唤醒」**。
  - 睡眠会弹出确认框（提示任务可能被暂停）。
  - 唤醒按钮始终可用，用 `caffeinate` 唤醒显示器。
- **指标卡**：CPU、内存、磁盘、网络（含迷你 Sparkline 趋势）。
- **Docker 状态卡**：运行中 / 已停止的容器数量。
- **当前任务（Current Tasks）**：⚠️ 此区块为**演示数据**（见 §9），
  标题旁有黄色「演示数据」徽章。
- **最近活动**：最近 6 条活动，可「查看全部」进入活动页。

页顶还会出现实时提示条：

- **Sleeping / 睡眠中**：Mac 已进入睡眠，可点「我唤醒了 Mac」。
- **Offline / 离线**：后端不可达，显示的是上一次已知数据（stale）。

### 6.2 可观测性（Observability）

Phase 10 新增，把系统从「控制面」升级为「可观测」：

- **健康评分（Health Score）**：0–100 的规则评分
  （离线节点 −30、近期错误每条 −5 上限 30、停服容器每个 −5 上限 20），
  下方列出节点在线/离线数、Docker 运行/停止数、近期错误数。
- **指标摘要（Metrics Summary）**：CPU / 内存 / 磁盘的时段均值与峰值。
- **指标历史图（CPU / Memory / Disk）**：基于 `metrics_samples` 的 SVG 折线图，
  展示平均值 / 最大值。
- **事件时间线（Event Timeline）**：带严重程度/分类的统一事件流。
- **自动化运行（Automation Runs）**：每条规则的执行历史（成功 / 失败 / 跳过）。

### 6.3 项目（Projects）

- 列表页：每个仓库显示健康状态、所在节点、分支、最近提交等。
- 详情页（点进某个项目）：仓库路径、远程、分支、HEAD、工作区状态
  （clean / dirty / 有改动文件）、领先/落后远程的提交数、最近提交。
- **全部只读**：只观测 Git 状态，不执行任何 commit / push / pull / checkout。

### 6.4 智能体（Agents）

- 列表页：所有已注册智能体的状态（运行中 / 空闲 / 离线 / 错误）、类型、描述。
- 详情页：身份、能力、当前项目 / 会话 / 任务、最近会话、相关活动。

> 当前版本只负责「认识与观察」智能体，不负责驱动；驱动属于后续执行面。

### 6.5 会话（Sessions）

- 会话生命周期记录：状态（created / running / completed / failed / cancelled）、
  开始/结束时间、关联的智能体 / 项目 / 研究。

### 6.6 研究（Research）

- 六类实体：**论文 Papers、项目 Projects、实验 Experiments、数据集 Datasets、
  笔记 Notes、报告 Reports**。
- 列表页支持分类筛选；详情页展示元数据、状态、时间等。

### 6.7 机器人（Robotics）⚠️ 演示数据

- 列表页：机器人卡片、训练运行、最新实验、实验清单。
- **整页内容当前为演示数据**（标题旁有「演示数据」徽章），
  还没有接入真实机器人/仿真后端（对应后续 Robotics 执行面）。

### 6.8 数据中心（Data Center）⚠️ 演示数据

- 存储总览：驱动器名称、容量、分类占用（数据集 / 模型 / 论文 / 视频 /
  实验 / 检查点 / 制品 / 智能体 / 记忆 / 备份）。
- **整页内容当前为演示数据**，尚未接入真实 2TB 数据层。

### 6.9 知识（Knowledge）

- **知识图谱列表**：自动索引的实体（项目 / 智能体 / 研究 / 论文 / 数据集 / 会话 / 活动…），
  支持搜索与类型过滤。
- **自动化规则区**：展示 YAML 规则及其执行状态（运行次数 / 上次运行 / 启用与否）。
- **上下文视图**（`/context/<type>/<id>`）：点击任一知识条目，聚合展示该实体的
  关联项目 / 智能体 / 会话 / 研究 / 相关活动。

### 6.10 活动（Activity）

- 全系统统一事件时间线：按时间倒序展示所有事件（保含类型、动作、消息、
  关联的项目 / 智能体 / 会话 / 研究）。
- 活动由 `activity_service.record()` 统一写入，是唯一事件来源。

---

## 7. 电源控制（睡眠 / 唤醒）

- 位置：工作台顶部的电源环按钮。
- **Sleep / 睡眠**：让 Mac 进入屏幕睡眠（主机仍在线）。会有确认对话框。
- **Wake / 唤醒**：让 Mac 显示器亮起（`caffeinate`）。睡眠中时按钮带脉冲光圈。

> 命令类操作需要后端配置了管理员 API token（见 §10），并有设备授权。

---

## 8. 实时性与状态含义

系统明确区分四种状态（不混淆旧数据与实时数据）：

| 状态 | 英文 | 含义 |
|---|---|---|
| 在线 | Online | 后端可达，显示实时数据 |
| 睡眠中 | Sleeping | 主机在线，但显示器关闭 |
| 离线 | Offline | 后端不可达 |
| 过期 | Stale | 实时连接中断，显示的是最近一次已知数据 |

- **实时机制**：单一 `EventSource`（SSE）推送 `node_status` / `metrics` /
  `metrics_snapshot` / `health_update` / `automation_event` 等；SSE 失效时自动
  **每 8 秒轮询兜底**。
- 顶部/页头有 **「Live / 实时」↔「Stale / 数据可能过期」** 小徽章。

---

## 9. 真实数据 vs 演示数据

当前**大部分页面已接入真实后端**，仅 3 个域还是演示数据（尚未实现），
页面上有黄色 **「演示数据」** 徽章标注：

| 演示内容 | 位置 |
|---|---|
| 机器人 / 训练 / 实验 | `/robotics` 整页 |
| 存储（2TB 数据层） | `/data-center` 整页 |
| 任务（Current Tasks） | 工作台「当前任务」区块 |

- 其余（节点、指标、服务、项目、智能体、会话、研究、知识、自动化、可观测性）
  在 `USE_MOCK=false` 时均为真实后端数据。
- **如何切换演示模式**：前端 `.env.local` 中 `NEXT_PUBLIC_USE_MOCK`：
  - `false` → 真实模式（默认，需后端运行）
  - 其它值 / 删掉该文件 → 全量演示模式（无需后端，顶部栏显示 `DEMO DATA`）

---

## 10. 配置说明

### 前端 `Silence-Personal-Control-Center/.env.local`（git-ignored）

```bash
# 是否使用演示数据
NEXT_PUBLIC_USE_MOCK=false
# 本地节点 id（须与后端一致）
NEXT_PUBLIC_NODE_ID=macbook-pro
```

> 后端 API 地址**无需手动配置**：前端运行时自动使用「当前页面同主机 :8000」，
> 因此 iPad 打开 `http://<Mac IP>:3000` 会自动连 `http://<Mac IP>:8000`，
> 换网络导致 IP 变化也无需改配置。

### 后端 `backend/.env`（git-ignored，前缀 `CONTROL_CENTER_`）

```bash
CONTROL_CENTER_ENV=development
CONTROL_CENTER_HOST=0.0.0.0        # 允许局域网访问
CONTROL_CENTER_PORT=8000
CONTROL_CENTER_API_TOKEN=<令牌>     # 保护命令/SSE 等敏感端点
CONTROL_CENTER_ALLOWED_ORIGINS=http://localhost:3000,http://<Mac IP>:3000
CONTROL_CENTER_NODE_ID=macbook-pro
CONTROL_CENTER_NODE_NAME=MacBook Pro
CONTROL_CENTER_HEARTBEAT_INTERVAL_SECONDS=10
```

- **API token**：用于命令（睡眠/唤醒）、SSE ticket、管理员接口（如 `/auth/pending`）。
- **CORS**：development 模式下后端还会放行所有内网私有地址段（10.x / 192.168.x / 172.16-31.x）。

### 数据与注册表（YAML）

- 项目 / 智能体 / 研究 / 知识 / 自动化规则等**静态注册表**在 `backend/config/*.yaml`，
  编辑后重启后端即可生效。

---

## 11. 常见问题排查

### 11.1 iPad 点「连接」进不去验证码页 / Mac 不弹验证码

**最可能原因：局域网 IP 变了（DHCP）导致后端地址/跨域失效。**

1. 确认 Mac 当前 IP（`ipconfig getifaddr en0`）与 iPad 打开页面的 IP 是否一致。
2. 确认后端已用 `--host 0.0.0.0` 启动，且 `:8000` 可通：
   `curl http://<Mac IP>:8000/health`。
3. 核对后端 `.env` 的 `CONTROL_CENTER_ALLOWED_ORIGINS` 是否含当前前端地址
   （development 下已用正则放行内网，通常无需手动改）。
4. 若仍不行：查看后端日志是否有 `PAIRING_CODE_ISSUED`；可用 `/auth/pending`
   （管理员 token）或日志直接拿验证码完成配对。

> 自 Phase 10 起，前端 API 地址已改为**运行时自动推导**（同主机 :8000），
> 不再写死 IP，绝大多数「连不上」会在换 IP 后自动恢复。

### 11.2 页面报 `webpack modules[moduleId] is not a function` / Server Error

这是 Next.js 开发服务 `.next` 缓存损坏（常在 dev 运行期间又执行 `pnpm build` 时发生）：

```bash
kill <dev 进程>
rm -rf .next
pnpm dev
```

建议：dev 运行期间不要在同一目录跑 `pnpm build`；跑完 build 再重启 dev。

### 11.3 一直显示 Offline / Stale

- 确认后端在运行、端口正确、iPad 与 Mac 同网段。
- 后端日志里应有稳定的 `GET /health 200`（前端每 3 秒探测一次）。

### 11.4 数据不刷新

- 大部分页面 30 秒自动刷新（`useAsync`），SSE 实时推送关键指标。
- 睡眠唤醒后会自动重连并重取数据（`silence:wake` 事件）。

---

## 12. 安全与边界

当前版本的边界（务必知悉）：

- **只读优先**：Git / Docker / 研究 / 机器人 / 数据 全部只读，不执行写入。
- **不执行 shell**：唯一执行能力是「屏幕睡眠 / 唤醒」，且需设备授权 + 管理员 token。
- **设备模型**：每个浏览器/设备独立 `device_code` + `access_token`，
  验证码一次性、5 分钟有效、hmac 比对。
- **LAN-only**：第一版仅局域网（或未来 Tailscale），不暴露公网。
- **最小权限**：自动化规则仅允许 `notify`（通知）与 `create_activity`（记活动），
  解析期即丢弃 `shell` 等危险动作。

---

*本文档覆盖 Phase 0–10 已实现功能。仍有「演示数据」徽章标注的内容（机器人 / 存储 / 任务）
为后续阶段接入项，接入真实后端后徽章会自动消失。*