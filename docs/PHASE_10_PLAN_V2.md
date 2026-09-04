# PHASE 10 PLAN

## Observability & Intelligence Plane


---

# 1. Phase Objective


Phase 0-9 已完成：

- Node Control Plane
- Project Control Plane
- Agent Control Plane
- Session Plane
- Research Plane
- Knowledge Plane
- Automation Plane


当前系统已经具备：

实体管理

关系管理

事件记录

自动化规则


但缺少：

- 历史数据
- 趋势分析
- 系统健康度
- 自动化可观测性


Phase 10 的目标：

将系统从：

Control Plane

升级为：

Observable Intelligent Operating System



---

# 2. Core Goals


## Goal A

Metrics Intelligence


当前：

实时 metrics


升级为：

Realtime Metrics

+

Historical Metrics

+

Trend Analysis



---

## Goal B

Health Intelligence


建立统一健康模型：


Node Health

+

Service Health

+

Automation Health

+

Recent Failure Analysis



---

## Goal C

Event Intelligence


升级：

Activity Timeline


成为：

Event Timeline


支持：

- severity
- category
- source
- correlation
- filtering



---

## Goal D

Automation Observability


Phase 9:

Rule Execution


Phase 10:

Rule Execution History

Failure Tracking

Trigger Analytics



---

# 3. Non Goals


本 Phase 不实现：

- Prometheus
- Grafana
- Kubernetes monitoring
- LLM analysis
- RAG
- Auto remediation
- Cloud monitoring



---

# 4. Architecture


## 4.1 Metrics Layer


新增：

metrics_samples


用途：

保存历史指标。


字段：


id

node_id

timestamp

cpu_percent

memory_percent

disk_percent

network_rx

network_tx

metadata



Retention:

30 days



---

# 5. Backend


新增：


backend/app/metrics_history/


models.py

schemas.py

service.py

routes.py



API:


GET

/api/v1/metrics/history


参数：


node_id

start

end

interval



---

# 6. Health Intelligence


新增：


health_service.py



提供：


GET

/api/v1/health/summary



返回：


overall_score

node_health

service_health

automation_health

recent_errors



新增：

health_snapshots



---

# 7. Event Intelligence


扩展 Activity。


新增字段：


severity

category



保持兼容：

nullable migration



新增 API:


GET

/api/v1/events/timeline



支持：


source

category

severity

start

end



---

# 8. Automation Observability


新增：


automation_runs


记录：

rule_id

trigger

status

started_at

finished_at

error



Automation engine:

增加 execution logging



---

# 9. SSE Extension


保持：

Single EventSource


新增事件：


metrics_snapshot


health_update


automation_event



RealtimeProvider:

新增 selector


不创建第二个 SSE。


---

# 10. Frontend


新增：


/observability



页面：

Health Overview

Metric History

Event Timeline

Automation Status



---

新增：

components/observability/


MetricChart

HealthScore

TimelineChart

AutomationPanel



---

新增 hooks:


useMetricsHistory()

useHealthSummary()

useEventTimeline()

useAutomationRuns()



---

# 11. Chart Decision


默认：

零依赖 SVG


原因：

保持：

轻量

iPad友好

无大型依赖



如复杂需求出现：

Phase 11 再评估 chart library。



---

# 12. Testing


Backend:


test_metrics_history.py

test_health.py

test_timeline.py

test_automation_runs.py



Frontend:


observability.test.tsx

metric-chart.test.tsx

health-card.test.tsx



---

# 13. Implementation Order


Step 1

Metrics history storage


Step 2

Metrics API


Step 3

Health Intelligence


Step 4

Event Timeline


Step 5

Automation Observability


Step 6

Frontend


Step 7

SSE


Step 8

Testing


Step 9

Documentation



---

# 14. Completion Criteria


完成后：


System:

拥有历史数据


Dashboard:

展示趋势


Health:

可量化


Events:

可查询


Automation:

可追踪



END