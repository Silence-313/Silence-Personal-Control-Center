# Phase 3 — Mac Backend + Node Agent Foundation

> Silence Personal Control Center · v0.1 · 真实控制平面地基

## 1. Goals

把 Phase 2 的 Mock Control Center 变成真实 Control Center，建立第一个真实闭环：

```
iPad → PWA → FastAPI (Control Plane) → Mac Node Agent (Execution Plane) → macOS
```

第一阶段的真实能力：查看 Mac 状态、实时 CPU/RAM/磁盘、Docker 状态、项目 Git 状态、Activity，以及受控的 **屏幕睡眠（Sleep）/ 唤醒（Wake）** 命令（仅这两个允许的真实操作）。

## 2. Architecture

```
               iPad (Safari PWA)
                    │  HTTP / LAN
                    ▼
        ┌────────────────────────┐
        │  Next.js PWA (:3000)   │   src/lib/backend.ts
        └──────────┬─────────────┘   (camelCase mapper)
                    │  REST / SSE  (/api/v1)
                    ▼
        ┌──────────────────────────────┐
        │  FastAPI Backend (:8000)      │
        │   API v1 · Auth · Command     │
        │   Gateway · SQLite · Logging  │
        └──────────────┬───────────────┘
                    │  (in-process Node Agent, v0.1)
                    ▼
        ┌──────────────────────────────┐
        │  Mac Node Agent               │
        │   Metrics · Docker · Git ·    │
        │   Power · Allowlisted ops     │
        └──────────────┬───────────────┘
                    ▼
                  macOS
```

- 后端不直接 `subprocess` 任意命令：每一处系统访问都是**硬编码的只读/白名单命令**。
- v0.1 单机（`macbook-pro`）Node Agent 与后端**同进程**运行；未来 Mac Studio / GPU Server 通过 Node 协议接入，无需推倒架构。

## 3. Backend

- `backend/` — `uv` 隔离环境（`.venv`），不污染 conda base / 系统 Python。
- FastAPI 0.141 + Uvicorn + Pydantic + SQLModel（SQLite）+ pydantic-settings + psutil + PyYAML。
- 结构（§8 建议，按需落地）：

```
backend/
├── app/
│   ├── main.py            # app factory, CORS, lifespan, 统一错误处理
│   ├── api/routes/        # health/nodes/metrics/services/power/commands/projects/activities/events
│   ├── api/dependencies.py# require_auth（Bearer 校验）
│   ├── core/              # config, logging, errors
│   ├── models/            # Node, Command, Activity (SQLModel)
│   ├── schemas/           # Pydantic 请求/响应
│   ├── services/          # node/metrics/docker/git/power/hardware/command/activity/project
│   └── db/database.py     # engine, session, init_db
├── config/projects.yaml   # 项目注册表（用户显式填写路径）
├── tests/                 # pytest（独立 test DB，不污染开发库）
├── pyproject.toml
└── .env.example
```

- 结构化 JSON 日志（`timestamp/level/logger/message` + `extra=` 字段，如 `command_id`）。
- 统一错误形状：`{"error": {"code": "...", "message": "..."}}`；不带 Python traceback。

## 4. Node Agent

- `NodeCapability`：`system_metrics / docker_read / git_read / power_read / power_sleep`（仅此五项；未来 `docker_control/ssh/filesystem/terminal` 不实现）。
- 节点注册表（SQLite `nodes` 表）+ 启动时注册 + 每 10s 心跳更新 `last_seen`。
- 状态判定：`last_seen` 超过 3×心跳间隔 → `offline`，否则 `online`。
- 硬件 enrich（只读 sysctl/psutil）：`model`（hw.model）、`chip`（cpu.brand_string = "Apple M3 Pro"）、性能/能效核数（`hw.perflevel*.logicalcpu`）、内存 GB、`ip`（socket）、`uptime_seconds`。

## 5. API

所有业务端点位于 `/api/v1/`。

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | `{"status":"ok","display_on":true}`（display_on 驱动 iPad 睡眠/唤醒态） |
| GET | `/api/v1/health` | 含 database/node_agent/docker 状态 |
| GET | `/api/v1/nodes` | 节点列表（含硬件） |
| GET | `/api/v1/nodes/{id}` | 单个节点 |
| GET | `/api/v1/nodes/{id}/metrics` | CPU/内存/磁盘/网络/uptime |
| GET | `/api/v1/nodes/{id}/services` | Docker 汇总 + 容器列表 + 磁盘占用 |
| GET | `/api/v1/nodes/{id}/power` | state/battery/charging/sleep_supported |
| GET | `/api/v1/projects` | 项目 + 只读 git 状态 |
| GET | `/api/v1/projects/{id}` | 单个项目 |
| GET | `/api/v1/activities` | 最近活动时间线 |
| POST | `/api/v1/commands` | **认证**；`sleep` + `wake` 白名单 |
| GET | `/api/v1/commands` | 命令历史（认证） |
| GET | `/api/v1/commands/{id}` | 单条命令状态（认证） |
| GET | `/api/v1/events` | SSE（metrics + node_status） |

命令响应示例（§12 一致的 Node，§15 一致的 metrics，见 `schemas/`）。

## 6. Data Models

SQLite（`backend/data/control-center.db`，gitignored）：

- `nodes`：id/name/platform/architecture/os_version/status/capabilities(JSON)/last_seen
- `commands`：id/node_id/command/target/status/requested_by/requested_at/started_at/finished_at/result
- `activities`：id/type/action/message/timestamp/node_id/command_id

实时 metrics **不落库**（直接采集）；历史数据将来再加 `metrics_history`。项目注册表是配置文件（不是 DB 表），与 §21/§59 一致。

## 7. Command System

校验链（§30）：

```
Schema 校验 (Pydantic)
   → 认证 (Bearer)
   → 节点存在校验
   → 白名单 (ALLOWED_COMMANDS = {"sleep", "wake"})
   → 能力校验 (node.capabilities 包含 power_sleep)
   → 执行（`sleep`→`pmset displaysleepnow` 屏息；`wake`→`caffeinate -u -t 1` 点亮，均固定参数、无 shell）
   → 审计日志 + Activity 记录
```

- 命令状态机：`queued → running → success|failed`，非法命令 → `rejected`（403）。
- 结构化审计日志事件：`COMMAND_REQUEST / COMMAND_REJECTED / COMMAND_ACCEPTED / COMMAND_STARTED / COMMAND_SUCCESS / COMMAND_FAILED`。
- **`shutdown`、`shell`、任意参数一律 403 `COMMAND_NOT_ALLOWED`**（有测试覆盖）。
- Sleep（屏息）执行在 API 响应发出后才在后台触发（1s 延迟线程），保证客户端先收到 Command ID；Wake 同步执行（`caffeinate` 约 1s，故直接返回）。

## 8. Security

- **设备授权（配对）**：局域网设备首次访问需配对——前端生成持久设备码 → 「连接」→ Mac 上随机生成并展示 6 位验证码（原生 AppKit 弹窗 `backend/bin/silence-code-alert` + 结构化日志）+ localhost 专属 `GET /api/v1/auth/pending` 可读 → 设备输入后获得独立 `access_token`，后续同设备免验证（localStorage 持久化）。
- **访问控制 `require_access`**：数据 + 命令 API 仅放行 (a) localhost / (b) 管理员 `CONTROL_CENTER_API_TOKEN` / (c) 有效设备 `access_token`；否则 401。SSE 未接入设备 token（预留）。
- CORS 白名单（可配置），**绝非 `*`**。
- 无任意 shell、无任意参数透传、无 shutdown/reboot/docker 控制。
- 默认监听 `127.0.0.1`；LAN 模式绑定 `0.0.0.0` 且**必须设置 token**，未受信设备一律 401。
- 前端**不内置**任何 token（避免 JS 泄露）；`CONTROL_CENTER_API_TOKEN` 仅作服务端管理员凭证。

## 9. Docker Monitoring（只读）

- 仅固定只读子进程：`docker version` / `docker ps -a` / `docker system df`。
- 返回：版本、daemon 状态、容器汇总（total/running/stopped/paused）、容器列表（name/image/status/ports/created_at）、磁盘占用（images/containers/volumes/build_cache）。
- 禁止 `start/stop/rm/exec/prune`。

## 10. Git Monitoring（只读）

- 注册表 `backend/config/projects.yaml`（用户显式填写绝对路径，**绝不扫描 home**）。
- 仅只读 `git status --porcelain` / `branch --show-current` / `log -1`（hash/subject/time）。
- 返回 branch / git_status(clean|dirty|…) / modified 计数 / last_commit。
- **Second Brain 只读，不 clone/修改/重构。**

## 11. Power Management

- `GET /api/v1/nodes/{id}/power` → `state=awake`, `battery`(%), `charging`, `sleep_supported`（pmset 存在）。
- **屏幕睡眠（屏息模式）**：`POST /api/v1/commands {"node_id","command":"sleep"}` → `pmset displaysleepnow`（只关屏幕，主机/后端保持运行），使 iPad 可远程唤醒。
- **唤醒**：`POST /api/v1/commands {"node_id","command":"wake"}` → `caffeinate -u -t 1`（模拟用户活动点亮屏幕）。
- `GET /health` 返回 `display_on`（实时屏幕亮/灭，读 `pmset -g log` 最近一条 "Display is turned on/off"），作为 iPad 睡眠/唤醒态的唯一事实源。

## 12. SSE

`GET /api/v1/events` 推送 `hello` / `node_status` / `metrics` 事件（metrics 每 5s，node_status 每 10s）。`activity`/`command_status` 事件将来在既有流上扩展。前端 `EventSource` 无法带自定义头，token 用 `?token=` 传（匹配时启用）。

## 13. Testing

`cd backend && uv run pytest` → **29 passed**（测试使用独立 `test-control-center.db`，不污染开发库）。

- `test_health / test_nodes / test_metrics / test_power / test_services`：真实系统/真实 docker；`test_health` 断言 `display_on` 字段存在。
- `test_commands`：sleep **与 wake** 均允许（mock executor，**不会真睡眠/真点亮**）、shutdown/shell 拒绝、无效节点拒绝。
- `test_security`：Bearer 无 token/错 token 401、正确 token 放行。
- `test_device_auth`：配对→验证码→签发 token→放行；错误码 401；过期 410；未受信设备 401、`/auth/pending` 403。
- `test_projects`：用临时 git 仓库验证只读 git 读取。
- `test_events`：SSE 生成器产出 hello/node_status/metrics。

真实 Sleep / Wake 不进入自动化测试（§53）；仅手动验证（已实测：sleep → `display_on=false`，wake → `display_on=true`）。

## 14. Deployment（本地局域网）

```bash
# 后端
cd backend
cp .env.example .env            # 按需填 token / origins
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000   # LAN 访问时 0.0.0.0:8000

# 前端（真实模式）
NEXT_PUBLIC_USE_MOCK=false \
NEXT_PUBLIC_API_BASE_URL=http://<Mac-LAN-IP>:8000 \
pnpm build && pnpm start
```

配置：`NEXT_PUBLIC_USE_MOCK`（false=真实）、`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_NODE_ID`（**无 token** — 设备通过配对授权）。

## 15. Known Issues

- `fastapi.testclient` 弃用提示：`httpx`→`httpx2`（不影响功能，升级随上游）。
- 前端网络/温度：网络已真实采集（与 CPU 同窗采样，首采样可能偏低）；**温度未采集**（Apple Silicon 无简易 sysctl，UI 显示「—」），留待 Phase 4（`powermetrics`/SMC 方案）。
- 项目 Git 状态已配置 7 个真实项目（`backend/config/projects.yaml`），只读返回 branch/status/modified/last-commit。
- agents/research/robotics/tasks/storage 仍为 mock（Phase 4+ 范围，§69）。
- SSE 的 activity/command_status 推送尚未接入（预留流，后端已具备 Activity 接口）。
- **屏息模式是「只关屏幕」，不是系统睡眠**：CPU/Docker/任务仍运行，仅显示器熄灭——这是换取「iPad 可远程唤醒」的取舍（纯网页无法发 WoL 魔术包，`sudo pmset` 调 powernap/womp 用户拒绝）。
- **唤醒后仍要求锁屏密码**：macOS「屏幕保护程序开始或显示器关闭后要求输入密码」默认开启；用户选择保留该安全设置，每次手动输密码（未做任何跳过）。

## 16. Phase 4 Handoff

```
Frontend still missing： temperature 采集、SSE/轮询实时刷新、agents/research/robotics/2TB data layer
Backend API available：   /api/v1/{nodes,metrics,services,power,projects,activities,commands,events,health}
Node capabilities：       system_metrics / docker_read / git_read / power_read / power_sleep
Commands available：      sleep（屏息/关屏）+ wake（点亮屏幕）
Security status：         设备配对授权 + CORS 白名单 + 白名单命令 + 无任意 shell + 无内置 token
Done (Phase 3.1+3.2)：    Mac 睡眠态展示（可达性监测 → display_on 状态）＋ 设备授权（配对 + 一次性验证码 + 免二次验证）
                          ＋ 屏息模式（屏幕睡眠）+ 唤醒按钮/命令 + 常驻「睡眠/唤醒」圆形按钮
Recommended Phase 4：     1) 局域网 iPad 联测 → 2) SSE 接入 UI / 轮询 → 3) temperature 采集 + 网络历史
                          → 4) Agent/Research/Robotics 后端 → 5) SSE 设备 token 补齐
```

## 17. Phase 3.1 追加功能

### 17.1 Mac 睡眠态展示（检测机制已被 §17.3 的 `display_on` 取代，仅留档）

> ⚠️ 本节描述的「探测失败 ⇒ sleeping」机制在屏息模式下失效（主机不睡、后端始终可达），
> 已替换为 §17.3 的屏幕状态（`/health` 的 `display_on`）检测。仅保留历史记录。

- 前端 `ReachabilityProvider` 每 4s 探测 `/api/v1/health`（2s 超时）；探测失败 => `sleeping`；`visibilitychange`/`focus` 时立即补一次探测（应对 iOS 锁屏/后台节流）。
- **乐观睡眠态（主路径）**：iPad 发出 `sleep` 指令成功后立即 `reportSleep()` → 状态切 `sleeping`（有 5s 宽限期防止唤醒前误翻回），无需等探测发现后端失联；唤醒仍靠探测 `sleeping→online`。
- 睡眠时：顶部 `SleepingBanner`（「Mac 睡眠中」）+ 节点状态徽标/电源卡片切为 `sleeping`（睡眠中），**保留最后一份数据**而非卡加载。
- `useAsync` 增加错误捕获（失败保留旧数据）+ 监听 `silence:wake`；唤醒后**多次重拉（0s/3s/8s）**，避免 docker/git 尚未就绪时单次失败留下旧数据；`resolveNodeId` 失败时清空缓存允许重试。
- 验证：停后端模拟睡眠，~4s 内显示 sleeping、保留旧数据；重启后端 ~4s 内自动回到 online 且数据复原。

### 17.2 设备授权（配对）

- 模型：`devices`（device_code + access_token）+ `pairings`（一次性验证码，5 分钟过期）。
- 端点：`POST /auth/pair` → `POST /auth/verify` → `GET /auth/status`；`GET /auth/pending`（仅 localhost/管理员）。
- 前端：首访无 token → `PairingGate` 弹窗「是否连接」+ 显示设备码 → 输入 Mac 上的 6 位验证码 → 获得 token → 放行；清除 localStorage 后需重新配对。
- 验证码经原生弹窗（`backend/bin/silence-code-alert`，AppKit 深色卡片 + 大号高亮验证码；`osascript display alert` 兜底）+ 结构化 JSON 日志 `PAIRING_CODE_ISSUED`；`GET /auth/pending` 作为 Mac 侧兜底读取。
- 验证：headless 全流程「弹窗→连接→输入验证码→数据加载→刷新免验证」通过；未带 token 访问 LAN 数据端点返回 401。

### 17.3 屏息模式（屏幕睡眠）+ 远程唤醒

**背景与决策**：真系统睡眠（`pmset sleepnow`）后，MacBook 会进入 Power Nap 暗唤醒并最终自行全醒（`UserActivity Assertion`，疑似桌面版抖音/网络活动），iPad 的 HTTP 探测也会把它戳醒，导致「睡眠中」约 5s 就误翻回「已唤醒」。而且纯网页**无法发送 WoL 魔术包**（浏览器禁裸 UDP），后端又跑在要睡觉的 Mac 上（睡后冻结），所以「真睡眠 + 网页远程唤醒」在现有架构里无法实现。最终选择 **屏息模式**：只关屏幕、主机保持运行，换取稳定的远程唤醒。`sudo pmset`（关 powernap/tcpkeepalive/womp）与「跳过锁屏密码」两项系统改动用户均**拒绝**。

**后端改动**：

- `power_service.sleep()`：`pmset sleepnow` → `pmset displaysleepnow`（只关屏）。
- 新增 `power_service.wake()`：`caffeinate -u -t 1`（模拟用户活动点亮屏幕）。
- 新增 `power_service.display_on()`：读 `pmset -g log` 最近一条 `Display is turned on/off` 事件，判定当前屏幕亮/灭（失败时默认 `True`，绝不误报「睡眠中」）。
- `/health` 响应新增 `display_on` 字段；`ALLOWED_COMMANDS` 增 `wake`（复用 `power_sleep` 能力位）。

**前端改动**：

- `ReachabilityProvider` 改为**读 `/health` 的 `display_on`**（3s 轮询）决定 `online/sleeping`，不再用 HTTP 成败判断；后端不可达仍保守判 `sleeping`。
- 新增常驻**圆形电源按钮** `src/components/node/PowerRingButton.tsx`（Dashboard 右上角）：🌙 **睡眠**（关屏，睡眠中自动置灰禁用）+ ☀️ **唤醒**（点亮，睡眠中带呼吸光圈，始终可点）。
- `唤醒` → `queue wake` + `reportAwake()`（立即转 online + `silence:wake` 触发数据重拉）；`睡眠` → `queue sleep` + `reportSleep()`。
- `mapCommand` 把 `wake` 也归为 `power` 目标。

**锁屏密码**：唤醒后 macOS 仍要求输入密码（「显示器关闭后要求输入密码」默认开启）。用户选择**保留**，每次手动解锁，不做任何跳过。

**验证**：后端 29 测试全绿（新增 `test_wake_allowed`，`test_health` 断言 `display_on`）。手动实测闭环：`sleep` → `display_on=false`（屏幕灭）→ `wake` → `display_on=true`（屏幕亮）。