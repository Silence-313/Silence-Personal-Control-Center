import type {
  AutomationRuleState,
  ContextData,
  KnowledgeItem,
  KnowledgeType,
  Relation,
  RelationType,
} from "@/types";

import { activities } from "@/mock/activities";
import { agentSessions } from "@/mock/agent-sessions";
import { agents } from "@/mock/agents";
import { projects } from "@/mock/projects";
import {
  datasets,
  experiments,
  papers,
  researchNotes,
  researchProjects,
  researchReports,
} from "@/mock/research";

const iso = (n = 0) => new Date(Date.now() - n * 60_000).toISOString();

function item(
  type: KnowledgeType,
  entityId: string,
  title: string,
  tags: string[] = [],
  summary = "",
): KnowledgeItem {
  return {
    id: `${type}:${entityId}`,
    entityId,
    type,
    title,
    summary,
    tags,
    metadata: { demo: true },
    createdAt: iso(5),
    updatedAt: iso(1),
  };
}

export const knowledgeItems: KnowledgeItem[] = [
  ...projects.map((p) => item("project", p.id, p.name, p.tech ?? [], p.description ?? "")),
  ...agents.map((a) => item("agent", a.id, a.name, a.capabilities, a.description)),
  ...researchProjects.map((r) => item("research", r.id, r.name, r.tags, r.description)),
  ...papers.map((p) => item("paper", p.id, p.title, p.tags)),
  ...datasets.map((d) => item("dataset", d.id, d.name)),
  ...experiments.map((e) => item("experiment", e.id, e.name)),
  ...researchReports.map((r) => item("report", r.id, r.title)),
  ...researchNotes.map((n) => item("note", n.id, n.title, n.tags)),
  ...agentSessions.map((s) => item("session", s.id, `Session ${s.id}`)),
  ...activities.slice(0, 6).map((a) => item("activity", a.id, a.message)),
];

function rel(source: string, type: RelationType, target: string): Relation {
  return {
    id: `${source}|${type}|${target}`,
    sourceId: source,
    targetId: target,
    relationType: type,
    createdAt: iso(2),
  };
}

export const relations: Relation[] = [
  ...researchProjects.flatMap((r) =>
    r.projectId ? [rel(`research:${r.id}`, "references", `project:${r.projectId}`)] : [],
  ),
  ...papers.map((p) =>
    p.researchProjectId ? rel(`paper:${p.id}`, "belongs_to", `research:${p.researchProjectId}`) : null,
  ),
  ...datasets.map((d) =>
    d.researchProjectId ? rel(`dataset:${d.id}`, "belongs_to", `research:${d.researchProjectId}`) : null,
  ),
  ...experiments.map((e) =>
    e.researchProjectId ? rel(`experiment:${e.id}`, "belongs_to", `research:${e.researchProjectId}`) : null,
  ),
  ...experiments.flatMap((e) =>
    e.datasetId ? [rel(`experiment:${e.id}`, "uses", `dataset:${e.datasetId}`)] : [],
  ),
  ...agents.flatMap((a) =>
    a.currentProjectId ? [rel(`agent:${a.id}`, "references", `project:${a.currentProjectId}`)] : [],
  ),
].filter((r): r is Relation => r !== null);

export const automationRules: AutomationRuleState[] = [
  {
    id: "failed-activity-alert",
    name: "Failed Activity Alert",
    enabled: true,
    triggerType: "activity.created",
    triggerValue: "failed",
    actions: ["notify", "create_activity"],
    runCount: 0,
    lastRunAt: null,
  },
  {
    id: "node-offline-alert",
    name: "Node Offline Alert",
    enabled: true,
    triggerType: "node.offline",
    triggerValue: "offline",
    actions: ["notify", "create_activity"],
    runCount: 0,
    lastRunAt: null,
  },
];

/** Mock-only context assembly (metadata only — the real endpoint aggregates). */
export function buildMockContext(type: string, id: string): ContextData | undefined {
  const found = knowledgeItems.find((i) => i.type === type && i.entityId === id);
  if (!found) return undefined;
  const related = relations.filter((r) => r.sourceId === found.id || r.targetId === found.id);
  return {
    type: found.type,
    id: found.entityId,
    entity: { id: found.entityId, title: found.title, type: found.type },
    relations: related,
    projects: [],
    agents: [],
    sessions: [],
    researchProjects: [],
    papers: [],
    datasets: [],
    experiments: [],
    reports: [],
    notes: [],
    activities: [],
    generatedAt: iso(0),
  };
}