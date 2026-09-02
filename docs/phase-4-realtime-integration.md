# Phase 4 — 前端 ↔ 后端实时集成与可靠性

> Silence Personal Control Center · v0.1 · 活跃态实时：SSE + 轮询兜底

## 1. Goals

把 Phase 3 的“默认实模式 REST + 一次性拉取”升级为**活跃态的实时控制面**，并建立一套清晰的可用性语义：

1. **实时指标**：CPU / 内存 / 磁盘 / 网络 / 节点状态通过 SSE 每 5–10 秒推送。
2. **可靠性兜底**：SSE 断开 / 不可用时自动降级到 REST 轮询，绝不白屏。
3. **四态语义**：`ONLINE` / `SLEEPING` / `OFFLINE` / `STALE`，UI 能区分“屏幕睡眠”与“后端离线”，并明确标注数据是否过期。
4. **安全不降级**：SSE 用短时 ticket 鉴权，长寿命 `access_token` 绝不进 URL / 访问日志。
5. **测试**：前后端自动化测试守住回归，测试绝不触发真实 `pmset` / `caffeinate`。

## 2. Architecture（实时链路）

```
                         ┌─────────────────────────────────────────┐
                         │  Next.js PWA (:3000)                     │
                         │   RealtimeProvider (single EventSource)  │
                         │     ├─ SSE  /api/v1/events?ticket=…       │
                         │     ├─ 指数退避 + 抖动重连                 │
                         │     └─ 降级轮询 fetchMetrics/fetchNodes    │
                         │   ReachabilityProvider (3s /health)       │
                         └───────────────┬─────────────────────────┘
                                         │ REST + SSE   (LAN)
                                         ▼
                         ┌─────────────────────────────────────────┐
                         │  FastAPI Backend (:8000)                 │
                         │   /auth/sse-ticket  (Bearer → 60s ticket) │
                         │   /events  (?ticket= 或 api_token)        │
                         │      hello → node_status(10s) → metrics(5s)│
                         └─────────────────────────────────────────┘
```

- **SSE 是主通道**：单条 `EventSource` 流，推送 `node_status`（10s）与 `metrics`（5s）。
- **REST 是初始 + 兜底**：首屏用 REST 填充；SSE 断线后由 `RealtimeProvider` 每 8s 轮询一轮 metrics + nodes。
- **中频 REST**：SSE 不覆盖的数据（Docker / Services / Projects / Activities / Power）由 `useAsync` 每 30s 轮询一次。
- **`silence:wake` 事件**在 SSE (重)连或 Mac 被唤醒后派发，让所有 REST 数据钩子原地重取（含 3s/8s 重试）。

## 3. State Model（四态语义）

| 状态 | 判定 | UI |
|---|---|---|
| **ONLINE** | `/health` 可达 且 `display_on=true` | 绿点在线，`LIVE` 徽标 |
| **SLEEPING** | `/health` 可达 且 `display_on=false` | 睡眠横幅（屏息） |
| **OFFLINE** | `/health` 不可达（后端离家/关机） | 离线横幅 + “上次数据” |
| **STALE** | 实时源不可用（离线 / SSE 断链） | “数据可能过期”徽标 |

关键修正：**unreachable ≠ sleeping**。睡眠意味着“主机可达但息屏”，离线意味着“后端不可达”。`classifyHealth(display_on)` 只负责 online/sleeping，`probe()` 在请求失败时返回 `offline`。

## 4. Backend Changes

### 4.1 SSE 短时 ticket（`app/services/sse_service.py`）
`EventSource` 无法携带 `Authorization` 头，所以设备先通过 `require_access` 保护的 REST 端点兑换短时 ticket，再用 `?ticket=` 打开流：

```
GET /api/v1/auth/sse-ticket      # Bearer access_token / api_token / localhost
  → { "token": "…", "expires_in_seconds": 60 }
GET /api/v1/events?ticket=…      # 校验 ticket 或 api_token；localhost 信任
```

- ticket 用 `secrets.token_urlsafe(32)`，内存存储，TTL 60s（TTL 内可复用，供浏览器原生重连）。
- `events.py` 的 `_sse_authorized()` 镜像 `require_access` 但改从 query 读取凭据；`api_token` 仍支持（headless / Mac 侧）。

### 4.2 相关文件
- `app/schemas/auth.py` — 新增 `SseTicketResponse`。
- `app/api/routes/auth.py` — 新增 `GET /auth/sse-ticket`。
- `app/api/routes/events.py` — `_sse_authorized()`。

## 5. Frontend Changes

### 5.1 `src/lib/realtime.tsx`（新增）
`RealtimeProvider` + `useRealtimeMetrics` / `useRealtimeNodeStatus` / `useRealtimeConnection`：

- 挂载即连：兑换 ticket → 打开单个 `EventSource`。
- `onopen` → `connection=open`，停止轮询，派发 `silence:wake` 触发全量重取。
- `metrics` / `node_status` 事件经 `backend.mapMetrics` 映射（SSE 的 metrics 载荷与 `/metrics` 同构）。
- `onerror` → `connection=reconnecting`，启轮询，指数退避（1s→…→30s + 抖动）后重连。
- 页面隐藏时关闭连接与定时器；重新可见 / 聚焦时立即重连（iOS 后台挂起 Socket 的恢复）。
- `useAsync` 增加可选 `refreshMs`，`useServices/useProjects/useActivities/usePower` 以 30s 中频轮询。

### 5.2 `src/lib/reachability.tsx`
- 类型加入 `"offline"`；导出 `classifyHealth` 与 `probe`（可单测）。
- `probe()` 失败返回 `offline`（不再误判为 sleeping）。

### 5.3 UI（dashboard / node detail）
- `ReachabilityNotice` 新增 `OfflineBanner`（后端不可达但展示上次数据）与 `LivePill`（实时 / 过期徽标）。
- dashboard 与 `/nodes/[id]` 合并 `liveMetrics ?? restMetrics`，节点状态合并 `sleeping/offline/live status`。

## 6. Testing

- **Backend**：`uv run pytest` → **32 passed**（新增 sse-ticket 流、ticket 校验、坏票 401、ticket 存储往返）。
- **Frontend**：`pnpm test`（Vitest 3 + jsdom）→ **23 passed**：
  - `backend.mappers` — snake_case→camelCase（`mapMetrics/mapNode/mapPower/mapCommand`）。
  - `reachability` — `classifyHealth` 与 `probe`（online/sleeping/offline 判定）。
  - `status` — `nodeStatus` 色调映射。
  - `api` — mock/real 缝隙：mock 模式 sleep/wake 只返回 queued，**零网络调用**（绝不触发真实命令）。

## 7. Run & Verify

```bash
# 后端（uv 环境）
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# 前端 — 实模式（iPad 经局域网访问，必须用 Mac 的 LAN IP）
NEXT_PUBLIC_USE_MOCK=false \
NEXT_PUBLIC_API_BASE_URL=http://<mac-lan-ip>:8000 \
pnpm build && HOSTNAME=0.0.0.0 pnpm start
# 前端 — Mock 演示模式（默认，无需后端）
pnpm build && pnpm start
```

验证 SSE 端到端（非 localhost 源，模拟 iPad 真实路径）：

```bash
TICKET=$(curl -s http://127.0.0.1:8000/api/v1/auth/sse-ticket | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -sN --max-time 12 "http://<mac-lan-ip>:8000/api/v1/events?ticket=$TICKET"
# 期望: event: hello / node_status / metrics 循环
```

## 8. Known Limitations / Tech Debt

- `backend.fetchNode(id)` 仍“拉全量再 find”（应改用 `/nodes/{id}`）。
- 前端 `Capability` 类型含 `sleep/wake`，与后端 5 值存在漂移（`wake` 复用 `power_sleep` capability）。
- Agents / Research / Robotics / Tasks / Storage 仍为 mock（本阶段不建其后端）。
- 唤醒每次仍需输入锁屏密码（用户主动保留；未经 `sudo pmset` 改动系统电源策略）。