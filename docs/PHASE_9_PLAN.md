
# PHASE 9 PLAN
# Knowledge & Automation Plane

Version:
Phase: 9
Status: Planned


---

# 1. Phase 9 Objective

Phase 9 的目标：

将 Silence Personal Control Center 从：

> 一个管理设备、项目、Agent、Research、Session 的 Dashboard

升级为：

> 一个具备个人知识索引与自动化能力的 Operating System。


核心能力：

1. Knowledge Entity Layer
2. Unified Context Layer
3. Event Intelligence
4. Automation Rule Engine
5. Agent Context Provider


---

# 2. Current System State


Phase 8 完成后：

已有：

## Infrastructure

- Node Control Plane
- Device Authentication
- SSE Realtime


## Project Plane

支持：

- Git project metadata
- repository status


## Agent Plane

支持：

- Agent registry
- Agent session


## Research Plane

支持：

- Research Project
- Paper
- Dataset
- Experiment
- Report
- Note


## Activity Plane

支持：

- command history
- activity timeline
- session events


---

# 3. Phase 9 Problem


当前系统：

```

Node
|
Project
|
Agent
|
Research
|
Activity

```

已经存在。


但是：

这些实体之间没有形成：

```

Knowledge Graph

Project
|
+---- Agent
|
+---- Research
|
+---- Dataset
|
+---- Experiment
|
+---- Activity
|
+---- Note

```


同时：

系统知道发生了什么：

但是不知道：

- 为什么发生
- 下一步是什么
- 哪些信息相关


---

# 4. Phase 9 Scope


## Included


### A. Knowledge Entity Layer

新增统一 Metadata Layer。


支持：

```

KnowledgeItem

id
type
title
summary
tags
relations
created_at
updated_at
metadata

```


type:

```

project
agent
research
paper
dataset
experiment
note
session
activity

```



---

### B. Relation Graph


建立实体关系。


Example:


```

G1-Dance Project
    |
    |
    +--- Agent
    |
    +--- Research Project
    |
    +--- Dataset
    |
    +--- Experiment
    |
    +--- Notes

```



Relation:

```

source_id

target_id

relation_type

created_at

```


relation_type:


```

belongs_to

uses

generated_by

depends_on

references

derived_from

```



---

### C. Context API


新增：

```

GET /api/v1/context/{entity}/{id}

```


返回：

某个实体相关全部上下文。



Example:

```

/context/project/g1-dance

```


返回：

```

Project

Agents

Research

Experiments

Recent Activities

Notes

```


用于：

- Agent prompt
- AI assistant
- Research workflow



---

### D. Automation Engine


新增：

Rule Registry:


```

backend/config/automation.yaml

````


Example:


```yaml

rules:

- id: failed-experiment-alert

  trigger:
    type: experiment.status
    value: failed


  action:

    - create_activity

    - notify


````

支持：

Trigger:

```
activity.created

experiment.updated

agent.failed

node.offline

project.changed
```

Action:

```
create_activity

send_notification

invoke_webhook

```

注意：

Phase 9:

禁止执行 shell。

禁止自动修改代码。

只做：

事件 → 动作。

---

# 5. Architecture

新增：

```
backend

 app

  knowledge/

    models.py

    service.py


  automation/

    engine.py

    rules.py


 config

   knowledge.yaml

   automation.yaml


```

Frontend:

```
src

 components

  knowledge/


 app

  knowledge/

  context/

```

---

# 6. Database Decision

采用：

SQLite

原因：

Phase 9 开始关系复杂。

YAML 不适合：

* graph relation
* history
* event

新增表：

## knowledge_items

```
id

type

title

summary

metadata

created_at

updated_at

```

## relations

```
id

source_id

target_id

relation_type

```

## automation_rules

```
id

name

enabled

trigger

action

```

---

# 7. Backend API

新增：

## Knowledge

```
GET /api/v1/knowledge

GET /api/v1/knowledge/{id}
```

## Relations

```
GET /api/v1/relations/{id}
```

## Context

```
GET /api/v1/context/{type}/{id}
```

## Automation

```
GET /api/v1/automation/rules
```

Phase 9:

只读为主。

Automation:

仅执行内部安全 action。

---

# 8. Frontend

新增页面：

## Knowledge Explorer

路径:

```
/knowledge
```

能力：

* entity search
* filter
* tags

---

## Context View

路径:

```
/context/[type]/[id]
```

展示：

```
Entity

Relations

Recent Activity

Related Research

Related Agents

```

---

# 9. Search

Phase 9 第一版：

不用向量数据库。

采用：

SQLite FTS5

支持：

* title
* summary
* tags

未来：

Phase 10:

embedding + RAG

---

# 10. Agent Integration

新增：

Context Provider

接口：

```
GET /api/v1/context/provider/{agent_id}
```

返回：

Agent 工作需要的信息。

Example:

Claude Code:

```
Current Project

Recent commits

Relevant notes

Experiments

Known issues
```

---

# 11. Testing

Backend:

新增：

```
test_knowledge.py

test_context.py

test_automation.py
```

覆盖：

* CRUD
* relation
* context aggregation
* rule matching

Frontend:

新增：

```
knowledge-list.test.tsx

context-view.test.tsx

```

---

# 12. Security

禁止：

❌ shell execution

❌ arbitrary webhook

❌ code modification

允许：

✅ metadata indexing

✅ internal events

✅ notification

---

# 13. Deliverables

Phase 9 完成：

Backend:

```
knowledge models

relation engine

context api

automation engine

tests
```

Frontend:

```
knowledge explorer

context page

relation visualization
```

Docs:

```
docs/phase-9-knowledge-plane.md

docs/phase-9-report.md
```

---

# 14. Acceptance Criteria

必须满足：

## Knowledge

[x] Entity indexing

[x] Search

## Context

[x] Project context available

[x] Agent context available

## Relation

[x] Relation query

## Automation

[x] Rule registry

[x] Event matching

---

# 15. Future

Phase 10:

AI Intelligence Plane

包含：

* Vector Database
* Embedding
* RAG
* Agent Memory
* Autonomous Workflow