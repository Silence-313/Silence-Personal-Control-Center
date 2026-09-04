# PHASE 10 PLAN

## Title

Observability & Intelligence Plane

---

# 1. Phase Goal

Phase 10 的目标：

将 Silence Personal Control Center 从：

> Entity Management Platform

升级为：

> Observable Intelligent Personal Operating System

Phase 0-9 已完成：

- Node Control Plane
- Project Control Plane
- Agent Control Plane
- Research Control Plane
- Session & Activity Plane
- Knowledge Plane
- Automation Plane

Phase 10 不新增大量业务实体。

重点解决：

1. 系统可观测性
2. 历史趋势分析
3. 指标存储
4. Dashboard Intelligence
5. Automation Intelligence


---

# 2. Phase 10 Scope

## Included

### A. Metrics History Plane

建立长期指标存储：

包括：

- CPU
- Memory
- Disk
- Network
- GPU（未来）
- Temperature（如果可用）


支持：

- 当前状态
- 历史趋势
- 时间范围查询


---

### B. Observability Dashboard

新增：

/observability


展示：

- System Health
- Resource Usage
- Historical Charts
- Node Stability
- Service Status


---

### C. Event Timeline Upgrade

升级 Activity：

从：

事件列表

变成：

时间线系统


支持：

- event category
- severity
- source
- correlation


---

### D. Health Intelligence

增加：

System Health Score


综合：

- node status
- service availability
- error rate
- recent failures
- resource pressure


---

### E. Automation Intelligence

扩展 Phase 9 Automation：

增加：

- rule evaluation history
- trigger statistics
- failure tracking


---

# 3. Explicitly NOT Included


Phase 10 不做：

- AI Agent 自动决策
- LLM 调用
- RAG
- Vector Database
- 自动修复系统
- 云监控接入
- Prometheus 全量替代


这些属于 Phase 11+。


---

# 4. Architecture Decision


## Metrics Storage

推荐：

SQLite


原因：

当前系统：

- 单用户
- 单节点
- 本地部署


无需：

InfluxDB
Prometheus
TimescaleDB


设计：

新增：

metrics_samples


字段：


id

node_id

timestamp

cpu_percent

memory_percent

disk_percent

network_rx

network_tx

metadata JSON



---

## Data Retention


默认：

30 days


策略：

daily cleanup


未来可配置。


---

# 5. Backend Design


新增：

backend/app/metrics/


结构：

```
metrics/

models.py

schemas.py

service.py

routes.py
```



---

## API


新增：

GET

/api/v1/metrics/history


参数：

node_id

start

end

interval



返回：

MetricSample[]


---

GET

/api/v1/health/summary


返回：

HealthSummary


包含：

overall_score

node_health

service_health

recent_errors



---

GET

/api/v1/events/timeline


增强 Activity 查询。


支持：

- severity
- source
- category


---

# 6. Frontend Design


新增页面：

src/app/observability/page.tsx

新增组件：

```
components/

observability/

MetricChart.tsx

HealthScore.tsx

TimelineChart.tsx

ResourceCard.tsx
```

---

新增 Hooks：
```

useMetricsHistory()

useHealthSummary()

useEventTimeline()

```



---

# 7. Realtime Integration


复用 Phase 4 SSE。


新增事件：


metrics_snapshot


health_update


automation_event



不创建第二个 EventSource。


---

# 8. Database Changes


新增表：


metrics_samples


automation_runs


health_snapshots


全部：

- nullable safe
- additive migration
- no destructive change


---

# 9. Testing Plan


Backend:


新增：

test_metrics.py

test_health.py

test_timeline.py


覆盖：

- authentication
- empty database
- query range
- invalid node
- aggregation



Frontend:


新增：

observability.test.tsx

metric-chart.test.tsx

health-card.test.tsx



---

# 10. Documentation


生成：

docs/

PHASE_10_OBSERVABILITY.md

PHASE_10_REPORT.md



---

# 11. Implementation Order


Step 0

Audit existing system


Step 1

Metrics storage design


Step 2

Backend metrics API


Step 3

Health aggregation


Step 4

Timeline upgrade


Step 5

Frontend dashboard


Step 6

SSE integration


Step 7

Testing


Step 8

Documentation



---

# 12. Risks


## Risk 1

Metrics database growth


Solution:

Retention policy


---

## Risk 2

Dashboard performance


Solution:

Aggregation query


---

## Risk 3

SSE overload


Solution:

Reuse existing stream


---

# 13. Completion Criteria


Phase 10 完成标准：


Backend:

- metrics history API works
- health summary works
- timeline query works


Frontend:

- observability page works
- charts display
- realtime updates work


Testing:

- backend tests pass
- frontend tests pass


Documentation:

- phase report completed


---

END
