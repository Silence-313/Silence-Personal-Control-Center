import type {
  Activity,
  Agent,
  Command,
  Node,
  PowerStatus,
  Project,
  ResearchItem,
  Robot,
  RoboticsExperiment,
  Service,
  StorageOverview,
  SystemMetrics,
  Task,
  TrainingRun,
} from "@/types";

import * as backend from "@/lib/backend";

import { activities } from "@/mock/activities";
import { agents } from "@/mock/agents";
import { metrics } from "@/mock/metrics";
import { nodes } from "@/mock/nodes";
import { projects } from "@/mock/projects";
import { researchItems } from "@/mock/research";
import { experiments, robots, trainingRuns } from "@/mock/robotics";
import { services } from "@/mock/services";
import { storage } from "@/mock/storage";
import { tasks } from "@/mock/tasks";

/**
 * API boundary — the seam between mock data (Phase 2) and the FastAPI backend
 * (Phase 3). Signatures never change, so the UI layer stays put.
 *
 * Set `NEXT_PUBLIC_USE_MOCK=false` to read real data; anything not yet backed
 * by the backend (agents/research/robotics/tasks/storage) keeps mock data.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

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

/* Agents (mock-only until Phase 4) -------------------------------------- */
export function getAgents(): Promise<Agent[]> {
  return latency(agents);
}

export function getAgent(id: string): Promise<Agent | undefined> {
  return latency(agents.find((a) => a.id === id));
}

/* Activity --------------------------------------------------------------- */
export function getActivities(): Promise<Activity[]> {
  return USE_MOCK ? latency(activities) : backend.fetchActivities();
}

/* Research (mock-only until Phase 4+) ------------------------------------ */
export function getResearch(): Promise<ResearchItem[]> {
  return latency(researchItems);
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