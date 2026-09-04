import type {
  Activity,
  Agent,
  AgentSession,
  AutomationRuleState,
  AutomationRun,
  Command,
  ContextData,
  Dataset,
  Experiment,
  HealthSummary,
  KnowledgeItem,
  MetricSample,
  MetricsSummary,
  Node,
  Paper,
  PowerStatus,
  Project,
  Relation,
  ResearchNote,
  ResearchProject,
  ResearchReport,
  Robot,
  RoboticsExperiment,
  Service,
  StorageOverview,
  SystemMetrics,
  Task,
  TrainingRun,
} from "@/types";

import * as backend from "@/lib/backend";
import { USE_MOCK } from "@/lib/data-source";

import { activities } from "@/mock/activities";
import { agentSessions } from "@/mock/agent-sessions";
import { agents } from "@/mock/agents";
import { metrics } from "@/mock/metrics";
import { nodes } from "@/mock/nodes";
import { projects } from "@/mock/projects";
import {
  datasets,
  experiments as researchExperiments,
  papers,
  researchNotes,
  researchProjects,
  researchReports,
} from "@/mock/research";
import { experiments, robots, trainingRuns } from "@/mock/robotics";
import { services } from "@/mock/services";
import { storage } from "@/mock/storage";
import { tasks } from "@/mock/tasks";
import { automationRules, buildMockContext, knowledgeItems, relations } from "@/mock/knowledge";
import {
  automationRuns,
  healthSummary,
  metricsHistory,
  metricsSummary,
} from "@/mock/observability";

/**
 * API boundary — the seam between mock data (Phase 2) and the FastAPI backend
 * (Phase 3). Signatures never change, so the UI layer stays put.
 *
 * Set `NEXT_PUBLIC_USE_MOCK=false` to read real data; anything not yet backed
 * by the backend (agents/research/robotics/tasks/storage) keeps mock data.
 */

const latency = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), 80));

/* Nodes ------------------------------------------------------------------ */
export function getNodes(): Promise<Node[]> {
  return USE_MOCK ? latency(nodes) : backend.fetchNodes();
}

export function getNode(id: string): Promise<Node | undefined> {
  return USE_MOCK ? latency(nodes.find((n) => n.id === id)) : backend.fetchNode(id);
}

/* Metrics ---------------------------------------------------------------- */
export function getMetrics(): Promise<SystemMetrics> {
  return USE_MOCK ? latency(metrics) : backend.fetchMetrics();
}

/* Services --------------------------------------------------------------- */
export function getServices(): Promise<Service[]> {
  return USE_MOCK ? latency(services) : backend.fetchServices();
}

/* Projects --------------------------------------------------------------- */
export function getProjects(): Promise<Project[]> {
  return USE_MOCK ? latency(projects) : backend.fetchProjects();
}

export function getProject(id: string): Promise<Project | undefined> {
  return USE_MOCK
    ? latency(projects.find((p) => p.id === id))
    : backend.fetchProject(id);
}

/* Agents ------------------------------------------------------------------ */
export function getAgents(): Promise<Agent[]> {
  return USE_MOCK ? latency(agents) : backend.fetchAgents();
}

export function getAgent(id: string): Promise<Agent | undefined> {
  return USE_MOCK ? latency(agents.find((a) => a.id === id)) : backend.fetchAgent(id);
}

export function getAgentSessions(id: string): Promise<AgentSession[]> {
  return USE_MOCK
    ? latency(agentSessions.filter((s) => s.agentId === id))
    : backend.fetchAgentSessions(id);
}

/* Session Plane (Phase 8) ------------------------------------------------- */
export function getSessions(): Promise<AgentSession[]> {
  return USE_MOCK ? latency(agentSessions) : backend.fetchSessions();
}

export function getSession(id: string): Promise<AgentSession | undefined> {
  return USE_MOCK
    ? latency(agentSessions.find((s) => s.id === id))
    : backend.fetchSession(id);
}

/* Activity --------------------------------------------------------------- */
export function getActivities(): Promise<Activity[]> {
  return USE_MOCK ? latency(activities) : backend.fetchActivities();
}

/* Research ---------------------------------------------------------------- */
export function getResearchProjects(): Promise<ResearchProject[]> {
  return USE_MOCK ? latency(researchProjects) : backend.fetchResearchProjects();
}

export function getResearchProject(id: string): Promise<ResearchProject | undefined> {
  return USE_MOCK
    ? latency(researchProjects.find((p) => p.id === id))
    : backend.fetchResearchProject(id);
}

export function getPapers(): Promise<Paper[]> {
  return USE_MOCK ? latency(papers) : backend.fetchPapers();
}

export function getPaper(id: string): Promise<Paper | undefined> {
  return USE_MOCK ? latency(papers.find((p) => p.id === id)) : backend.fetchPaper(id);
}

export function getDatasets(): Promise<Dataset[]> {
  return USE_MOCK ? latency(datasets) : backend.fetchDatasets();
}

export function getDataset(id: string): Promise<Dataset | undefined> {
  return USE_MOCK ? latency(datasets.find((d) => d.id === id)) : backend.fetchDataset(id);
}

export function getExperiments(): Promise<Experiment[]> {
  return USE_MOCK ? latency(researchExperiments) : backend.fetchExperiments();
}

export function getExperiment(id: string): Promise<Experiment | undefined> {
  return USE_MOCK
    ? latency(researchExperiments.find((e) => e.id === id))
    : backend.fetchExperiment(id);
}

export function getResearchReports(): Promise<ResearchReport[]> {
  return USE_MOCK ? latency(researchReports) : backend.fetchResearchReports();
}

export function getResearchReport(id: string): Promise<ResearchReport | undefined> {
  return USE_MOCK
    ? latency(researchReports.find((r) => r.id === id))
    : backend.fetchResearchReport(id);
}

export function getResearchNotes(): Promise<ResearchNote[]> {
  return USE_MOCK ? latency(researchNotes) : backend.fetchResearchNotes();
}

export function getResearchNote(id: string): Promise<ResearchNote | undefined> {
  return USE_MOCK
    ? latency(researchNotes.find((n) => n.id === id))
    : backend.fetchResearchNote(id);
}

/* Knowledge & Automation (Phase 9) ---------------------------------------- */
export function getKnowledgeItems(params?: {
  q?: string;
  type?: string;
  tag?: string;
}): Promise<KnowledgeItem[]> {
  if (!USE_MOCK) return backend.fetchKnowledgeItems(params);
  let items = knowledgeItems;
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  if (params?.type) items = items.filter((i) => i.type === params.type);
  if (params?.tag) items = items.filter((i) => i.tags.includes(params.tag as string));
  return latency(items);
}

export function getKnowledgeItem(id: string): Promise<KnowledgeItem | undefined> {
  return USE_MOCK
    ? latency(knowledgeItems.find((i) => i.id === id || i.entityId === id))
    : backend.fetchKnowledgeItem(id);
}

export function getRelations(id: string): Promise<Relation[]> {
  return USE_MOCK
    ? latency(
        relations.filter(
          (r) =>
            r.sourceId === id ||
            r.targetId === id ||
            r.sourceId.endsWith(`:${id}`) ||
            r.targetId.endsWith(`:${id}`),
        ),
      )
    : backend.fetchRelations(id);
}

export function getContext(type: string, id: string): Promise<ContextData | undefined> {
  return USE_MOCK ? latency(buildMockContext(type, id)) : backend.fetchContext(type, id);
}

export function getAutomationRules(): Promise<AutomationRuleState[]> {
  return USE_MOCK ? latency(automationRules) : backend.fetchAutomationRules();
}

/* Observability (Phase 10) ------------------------------------------------ */
export function getMetricsHistory(params?: {
  nodeId?: string;
  start?: string;
  end?: string;
  limit?: number;
}): Promise<MetricSample[]> {
  return USE_MOCK ? latency(metricsHistory) : backend.fetchMetricsHistory(params);
}

export function getMetricsSummary(params?: {
  nodeId?: string;
  range?: string;
}): Promise<MetricsSummary> {
  return USE_MOCK ? latency(metricsSummary) : backend.fetchMetricsSummary(params);
}

export function getHealthSummary(): Promise<HealthSummary> {
  return USE_MOCK ? latency(healthSummary) : backend.fetchHealthSummary();
}

export function getEventTimeline(params?: {
  severity?: string;
  category?: string;
  source?: string;
  start?: string;
  end?: string;
  limit?: number;
}): Promise<Activity[]> {
  return USE_MOCK ? latency(activities) : backend.fetchEventTimeline(params);
}

export function getAutomationRuns(): Promise<AutomationRun[]> {
  return USE_MOCK ? latency(automationRuns) : backend.fetchAutomationRuns();
}

/* Robotics (mock-only until Phase 4+) ------------------------------------ */
export function getRobots(): Promise<Robot[]> {
  return latency(robots);
}

export function getTrainingRuns(): Promise<TrainingRun[]> {
  return latency(trainingRuns);
}

export function getRoboticsExperiments(): Promise<RoboticsExperiment[]> {
  return latency(experiments);
}

/* Storage (mock-only until the 2TB data layer is onboarded) --------------- */
export function getStorage(): Promise<StorageOverview> {
  return latency(storage);
}

/* Tasks (mock-only until Phase 4+) --------------------------------------- */
export function getTasks(): Promise<Task[]> {
  return latency(tasks);
}

/* Power ------------------------------------------------------------------ */
export function getPower(nodeId: string): Promise<PowerStatus> {
  return USE_MOCK
    ? latency({ state: "awake", battery: 87, charging: true, sleepSupported: true })
    : backend.fetchPower(nodeId);
}

/* Commands --------------------------------------------------------------- */
export function sendCommand(
  input: Omit<Command, "commandId" | "createdAt" | "status">,
): Promise<Command> {
  if (!USE_MOCK) {
    return backend.sendCommand(input);
  }

  const command: Command = {
    ...input,
    commandId: `cmd-${Date.now()}`,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.info("[demo] command queued (not executed):", command);
  return latency(command);
}