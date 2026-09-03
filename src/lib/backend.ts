/**
 * Real backend HTTP client + response → domain-type mappers.
 *
 * The FastAPI backend speaks snake_case; the UI speaks camelCase domain types.
 * These mappers are the single translation layer. Everything here only runs
 * when `NEXT_PUBLIC_USE_MOCK === "false"`.
 */

import { formatUptime } from "@/lib/format";
import { getAccessToken } from "@/lib/device";
import type {
  Activity,
  ActivityLevel,
  ActivitySource,
  Agent,
  AgentSession,
  AgentStatus,
  AgentType,
  Capability,
  Command,
  CommandStatus,
  Dataset,
  DatasetStatus,
  Experiment,
  ResearchExperimentStatus,
  Node,
  NodeArchitecture,
  NodePlatform,
  NodeStatus,
  Paper,
  PaperStatus,
  PowerStatus,
  PowerState,
  Project,
  ProjectHealth,
  ResearchNote,
  ResearchProject,
  ResearchProjectStatus,
  ResearchReport,
  ResearchReportFormat,
  ResearchReportStatus,
  ResearchRuntime,
  Service,
  SessionStatus,
  SystemMetrics,
} from "@/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  "http://localhost:8000";
const LOCAL_NODE_ID = process.env.NEXT_PUBLIC_NODE_ID ?? "macbook-pro";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (init?.body) headers["Content-Type"] = "application/json";
  const deviceToken = getAccessToken();
  if (deviceToken) headers.Authorization = `Bearer ${deviceToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(0, "NETWORK_ERROR", err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401) {
      try {
        window.dispatchEvent(new CustomEvent("silence:unauthorized"));
      } catch {
        /* non-window environment */
      }
    }
    let code = `HTTP_${response.status}`;
    let message = response.statusText || "Request failed";
    try {
      const body = await response.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, code, message);
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------- raw shapes

interface BNode {
  id: string;
  name: string;
  platform: string;
  architecture: string;
  os_version: string;
  status: string;
  capabilities: string[];
  last_seen: string;
  model?: string | null;
  ip?: string | null;
  uptime_seconds?: number | null;
  hardware?: {
    chip: string;
    cpu_cores: number;
    performance_cores: number;
    efficiency_cores: number;
    memory_gb: number;
    gpu: string;
  } | null;
}

export interface BMetrics {
  cpu: {
    usage_percent: number;
    cores: number;
    per_core: number[];
    load_average: number[];
  };
  memory: { total_bytes: number; used_bytes: number; usage_percent: number };
  disk: { total_bytes: number; used_bytes: number; usage_percent: number };
  network: { down_mbps: number; up_mbps: number };
  uptime_seconds: number;
  collected_at: string;
}

interface BServices {
  docker: {
    version: string | null;
    daemon_running: boolean;
    containers: { total: number; running: number; stopped: number };
    disk: Record<string, number>;
  };
  containers: Array<{
    name: string;
    image: string;
    status: string;
    status_text: string;
    ports: string[];
    created_at: string;
  }>;
}

interface BProject {
  id: string;
  name: string;
  node_id: string;
  path: string;
  type: string;
  branch: string | null;
  git_status: string | null;
  health: string | null;
  modified: number;
  remote: string | null;
  ahead: number | null;
  behind: number | null;
  head: string | null;
  last_commit: string | null;
  last_commit_subject: string | null;
  last_commit_time: string | null;
}

interface BAgent {
  id: string;
  name: string;
  type?: string;
  description: string;
  status?: string;
  node_id: string;
  current_project_id: string | null;
  current_session_id: string | null;
  current_task: string | null;
  last_activity_at: string | null;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

interface BAgentSession {
  id: string;
  agent_id: string;
  node_id: string;
  project_id: string | null;
  research_project_id: string | null;
  status?: string;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  current_task: string | null;
}

interface BResearchProject {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  repository_path: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

interface BRuntime {
  exists: boolean;
  missing: boolean;
  size_bytes: number | null;
  modified_at: string | null;
  error: string | null;
}

interface BPaper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  pdf_path: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  research_project_id: string | null;
  created_at: string;
  updated_at: string;
  runtime?: BRuntime | null;
}

interface BDataset {
  id: string;
  name: string;
  description: string | null;
  path: string | null;
  size_bytes: number | null;
  format: string | null;
  source: string | null;
  version: string | null;
  status: string;
  research_project_id: string | null;
  created_at: string;
  updated_at: string;
  runtime?: BRuntime | null;
}

interface BExperiment {
  id: string;
  name: string;
  description: string | null;
  research_project_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  dataset_id: string | null;
  command: string | null;
  result: string | null;
  metrics: Record<string, unknown> | null;
  artifact_path: string | null;
  created_at: string;
  updated_at: string;
  runtime?: BRuntime | null;
}

interface BResearchReport {
  id: string;
  title: string;
  description: string | null;
  path: string | null;
  format: string;
  research_project_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  runtime?: BRuntime | null;
}

interface BResearchNote {
  id: string;
  title: string;
  content: string | null;
  research_project_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface BActivity {
  id: string;
  type: string;
  action: string;
  message: string;
  timestamp: string;
  node_id: string | null;
  command_id: string | null;
  project_id: string | null;
  agent_id: string | null;
  session_id: string | null;
  research_project_id: string | null;
}

interface BCommand {
  id: string;
  node_id: string;
  command: string;
  status: string;
  requested_at: string;
  result: string | null;
}

interface BPower {
  state: string;
  battery: number | null;
  charging: boolean | null;
  sleep_supported: boolean;
}

// ---------------------------------------------------------------- mappers

const CAPABILITY_MAP: Record<string, Capability> = {
  system_metrics: "system_metrics",
  docker_read: "docker_read",
  git_read: "git_read",
  power_read: "power_read",
  power_sleep: "power_sleep",
};

const gb = (bytes: number): number => Math.round((bytes / 1024 ** 3) * 10) / 10;

export function mapNode(b: BNode): Node {
  return {
    id: b.id,
    name: b.name,
    model: b.model ?? "Mac",
    platform: (b.platform as NodePlatform) ?? "unknown",
    architecture: (b.architecture as NodeArchitecture) ?? "unknown",
    status: (b.status as NodeStatus) ?? "unknown",
    capabilities: (b.capabilities ?? [])
      .map((c) => CAPABILITY_MAP[c] ?? c)
      .filter(Boolean) as Capability[],
    hardware: {
      chip: b.hardware?.chip ?? "unknown",
      cpuCores: b.hardware?.cpu_cores ?? 0,
      performanceCores: b.hardware?.performance_cores ?? 0,
      efficiencyCores: b.hardware?.efficiency_cores ?? 0,
      memoryGb: b.hardware?.memory_gb ?? 0,
      gpu: b.hardware?.gpu ?? "unknown",
    },
    osVersion: b.os_version,
    ip: b.ip ?? "—",
    uptime: formatUptime(b.uptime_seconds ?? 0),
    lastSeen: b.last_seen,
  };
}

export function mapMetrics(b: BMetrics, nodeId: string): SystemMetrics {
  return {
    nodeId,
    cpu: {
      usagePct: b.cpu.usage_percent,
      loadAvg: b.cpu.load_average?.[0] ?? 0,
      cores: b.cpu.cores,
      history: b.cpu.per_core ?? [],
    },
    memory: {
      usedGb: gb(b.memory.used_bytes),
      totalGb: gb(b.memory.total_bytes),
      usagePct: b.memory.usage_percent,
      history: [],
    },
    storage: {
      usedGb: gb(b.disk.used_bytes),
      totalGb: gb(b.disk.total_bytes),
      usagePct: b.disk.usage_percent,
    },
    network: { downMbps: b.network?.down_mbps ?? 0, upMbps: b.network?.up_mbps ?? 0 },
    temperatureC: 0,
    updatedAt: b.collected_at ?? new Date().toISOString(),
  };
}

function parsePort(ports: string[] | undefined): number | undefined {
  const first = ports?.[0];
  if (!first) return undefined;
  const arrow = first.indexOf("->");
  const hostPart = arrow >= 0 ? first.slice(0, arrow) : "";
  const match = hostPart.match(/:(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

export function mapServices(b: BServices, nodeId: string): Service[] {
  return (b.containers ?? []).map((c) => ({
    id: c.name,
    name: c.name,
    nodeId,
    type: "docker",
    status: c.status === "running" ? "running" : "stopped",
    health: "unknown",
    port: parsePort(c.ports),
    description: c.image,
  }));
}

export function mapProject(p: BProject): Project {
  const workingTree: Project["workingTree"] =
    p.git_status === "clean" ? "clean" : p.git_status === "dirty" ? "dirty" : "unknown";
  return {
    id: p.id,
    name: p.name,
    nodeId: p.node_id ?? "",
    repositoryPath: p.path,
    repositoryType: p.type ?? "git",
    branch: p.branch ?? "detached",
    remote: p.remote ?? undefined,
    health: (p.health ?? "unknown") as ProjectHealth,
    workingTree,
    modified: p.modified > 0 ? p.modified : undefined,
    ahead: p.ahead ?? undefined,
    behind: p.behind ?? undefined,
    head: p.head ?? undefined,
    lastCommitHash: p.last_commit ?? "",
    lastCommitSubject: p.last_commit_subject ?? "—",
    lastCommitTime: p.last_commit_time ?? undefined,
  };
}

export function mapAgent(a: BAgent): Agent {
  return {
    id: a.id,
    name: a.name,
    type: (a.type ?? "general") as AgentType,
    description: a.description ?? "",
    status: (a.status ?? "unknown") as AgentStatus,
    nodeId: a.node_id ?? "",
    currentProjectId: a.current_project_id ?? undefined,
    currentSessionId: a.current_session_id ?? undefined,
    currentTask: a.current_task ?? undefined,
    lastActivityAt: a.last_activity_at ?? undefined,
    capabilities: a.capabilities ?? [],
    metadata: a.metadata ?? {},
  };
}

export function mapAgentSession(s: BAgentSession): AgentSession {
  return {
    id: s.id,
    agentId: s.agent_id,
    nodeId: s.node_id,
    projectId: s.project_id ?? undefined,
    researchProjectId: s.research_project_id ?? undefined,
    status: (s.status ?? "created") as SessionStatus,
    startedAt: s.started_at,
    endedAt: s.ended_at ?? undefined,
    lastActivityAt: s.last_activity_at,
    currentTask: s.current_task ?? undefined,
  };
}

export function mapResearchProject(p: BResearchProject): ResearchProject {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    status: (p.status ?? "active") as ResearchProjectStatus,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    projectId: p.project_id ?? undefined,
    repositoryPath: p.repository_path ?? undefined,
    tags: p.tags ?? [],
    metadata: p.metadata ?? {},
  };
}

function mapRuntime(r?: BRuntime | null): ResearchRuntime | undefined {
  if (!r) return undefined;
  return {
    exists: r.exists,
    missing: r.missing,
    sizeBytes: r.size_bytes ?? undefined,
    modifiedAt: r.modified_at ?? undefined,
    error: r.error ?? undefined,
  };
}

export function mapPaper(p: BPaper): Paper {
  return {
    id: p.id,
    title: p.title,
    authors: p.authors ?? [],
    year: p.year ?? undefined,
    venue: p.venue ?? undefined,
    doi: p.doi ?? undefined,
    url: p.url ?? undefined,
    pdfPath: p.pdf_path ?? undefined,
    status: (p.status ?? "unread") as PaperStatus,
    tags: p.tags ?? [],
    notes: p.notes ?? undefined,
    researchProjectId: p.research_project_id ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    runtime: mapRuntime(p.runtime),
  };
}

export function mapDataset(d: BDataset): Dataset {
  return {
    id: d.id,
    name: d.name,
    description: d.description ?? undefined,
    path: d.path ?? undefined,
    sizeBytes: d.size_bytes ?? undefined,
    format: d.format ?? undefined,
    source: d.source ?? undefined,
    version: d.version ?? undefined,
    status: (d.status ?? "available") as DatasetStatus,
    researchProjectId: d.research_project_id ?? undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    runtime: mapRuntime(d.runtime),
  };
}

export function mapExperiment(e: BExperiment): Experiment {
  return {
    id: e.id,
    name: e.name,
    description: e.description ?? undefined,
    researchProjectId: e.research_project_id ?? undefined,
    status: (e.status ?? "planned") as ResearchExperimentStatus,
    startedAt: e.started_at ?? undefined,
    endedAt: e.ended_at ?? undefined,
    datasetId: e.dataset_id ?? undefined,
    command: e.command ?? undefined,
    result: e.result ?? undefined,
    metrics: e.metrics ?? undefined,
    artifactPath: e.artifact_path ?? undefined,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    runtime: mapRuntime(e.runtime),
  };
}

export function mapResearchReport(r: BResearchReport): ResearchReport {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    path: r.path ?? undefined,
    format: (r.format ?? "markdown") as ResearchReportFormat,
    researchProjectId: r.research_project_id ?? undefined,
    status: (r.status ?? "draft") as ResearchReportStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    runtime: mapRuntime(r.runtime),
  };
}

export function mapResearchNote(n: BResearchNote): ResearchNote {
  return {
    id: n.id,
    title: n.title,
    content: n.content ?? undefined,
    researchProjectId: n.research_project_id ?? undefined,
    tags: n.tags ?? [],
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

const SOURCE_MAP: Record<string, ActivitySource> = {
  command: "control",
  docker: "docker",
  git: "git",
  research: "research",
  robotics: "robotics",
  agent: "agent",
  system: "system",
  node: "system",
};

function activityLevel(action: string): ActivityLevel {
  if (/fail|error|reject/i.test(action)) return "error";
  if (/success|scheduled|requested|accept/i.test(action)) return "success";
  return "info";
}

export function mapActivity(a: BActivity): Activity {
  return {
    id: a.id,
    timestamp: a.timestamp,
    source: SOURCE_MAP[a.type] ?? "system",
    level: activityLevel(a.action),
    message: a.message,
    detail: a.action,
    nodeId: a.node_id ?? undefined,
    projectId: a.project_id ?? undefined,
    agentId: a.agent_id ?? undefined,
    sessionId: a.session_id ?? undefined,
    researchProjectId: a.research_project_id ?? undefined,
  };
}

const COMMAND_STATUS_MAP: Record<string, CommandStatus> = {
  queued: "queued",
  running: "running",
  success: "completed",
  failed: "failed",
  rejected: "rejected",
};

export function mapCommand(b: BCommand): Command {
  return {
    commandId: b.id,
    nodeId: b.node_id,
    target: b.command === "sleep" || b.command === "wake" ? "power" : "service",
    action: b.command,
    status: COMMAND_STATUS_MAP[b.status] ?? "queued",
    createdAt: b.requested_at,
  };
}

export function mapPower(b: BPower): PowerStatus {
  return {
    state: (b.state as PowerState) ?? "unknown",
    battery: b.battery ?? null,
    charging: b.charging ?? null,
    sleepSupported: b.sleep_supported,
  };
}

// ---------------------------------------------------------------- fetchers

let nodeIdPromise: Promise<string> | null = null;

async function resolveNodeId(): Promise<string> {
  if (!nodeIdPromise) {
    nodeIdPromise = request<BNode[]>("/api/v1/nodes")
      .then((nodes) => nodes[0]?.id ?? LOCAL_NODE_ID)
      .catch((err) => {
        nodeIdPromise = null; // don't poison future calls with a failed promise
        throw err;
      });
  }
  return nodeIdPromise;
}

export async function fetchNodes(): Promise<Node[]> {
  const nodes = await request<BNode[]>("/api/v1/nodes");
  return nodes.map(mapNode);
}

export async function fetchNode(id: string): Promise<Node | undefined> {
  const nodes = await request<BNode[]>("/api/v1/nodes");
  const found = nodes.find((n) => n.id === id);
  return found ? mapNode(found) : undefined;
}

export async function fetchMetrics(): Promise<SystemMetrics> {
  const nodeId = await resolveNodeId();
  const metrics = await request<BMetrics>(`/api/v1/nodes/${nodeId}/metrics`);
  return mapMetrics(metrics, nodeId);
}

export async function fetchServices(): Promise<Service[]> {
  const nodeId = await resolveNodeId();
  const services = await request<BServices>(`/api/v1/nodes/${nodeId}/services`);
  return mapServices(services, nodeId);
}

export async function fetchProjects(): Promise<Project[]> {
  const projects = await request<BProject[]>("/api/v1/projects");
  return projects.map(mapProject);
}

export async function fetchProject(id: string): Promise<Project | undefined> {
  try {
    const project = await request<BProject>(`/api/v1/projects/${encodeURIComponent(id)}`);
    return mapProject(project);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchAgents(): Promise<Agent[]> {
  const agents = await request<BAgent[]>("/api/v1/agents");
  return agents.map(mapAgent);
}

export async function fetchAgent(id: string): Promise<Agent | undefined> {
  try {
    const agent = await request<BAgent>(`/api/v1/agents/${encodeURIComponent(id)}`);
    return mapAgent(agent);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchAgentSessions(id: string): Promise<AgentSession[]> {
  const sessions = await request<BAgentSession[]>(
    `/api/v1/agents/${encodeURIComponent(id)}/sessions`,
  );
  return sessions.map(mapAgentSession);
}

export async function fetchSessions(): Promise<AgentSession[]> {
  const sessions = await request<BAgentSession[]>("/api/v1/sessions");
  return sessions.map(mapAgentSession);
}

export async function fetchSession(id: string): Promise<AgentSession | undefined> {
  try {
    const session = await request<BAgentSession>(
      `/api/v1/sessions/${encodeURIComponent(id)}`,
    );
    return mapAgentSession(session);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchResearchProjects(): Promise<ResearchProject[]> {
  const items = await request<BResearchProject[]>("/api/v1/research/projects");
  return items.map(mapResearchProject);
}

export async function fetchResearchProject(id: string): Promise<ResearchProject | undefined> {
  try {
    const item = await request<BResearchProject>(
      `/api/v1/research/projects/${encodeURIComponent(id)}`,
    );
    return mapResearchProject(item);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchPapers(): Promise<Paper[]> {
  const items = await request<BPaper[]>("/api/v1/research/papers");
  return items.map(mapPaper);
}

export async function fetchPaper(id: string): Promise<Paper | undefined> {
  try {
    const item = await request<BPaper>(`/api/v1/research/papers/${encodeURIComponent(id)}`);
    return mapPaper(item);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const items = await request<BDataset[]>("/api/v1/research/datasets");
  return items.map(mapDataset);
}

export async function fetchDataset(id: string): Promise<Dataset | undefined> {
  try {
    const item = await request<BDataset>(`/api/v1/research/datasets/${encodeURIComponent(id)}`);
    return mapDataset(item);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const items = await request<BExperiment[]>("/api/v1/research/experiments");
  return items.map(mapExperiment);
}

export async function fetchExperiment(id: string): Promise<Experiment | undefined> {
  try {
    const item = await request<BExperiment>(
      `/api/v1/research/experiments/${encodeURIComponent(id)}`,
    );
    return mapExperiment(item);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchResearchReports(): Promise<ResearchReport[]> {
  const items = await request<BResearchReport[]>("/api/v1/research/reports");
  return items.map(mapResearchReport);
}

export async function fetchResearchReport(id: string): Promise<ResearchReport | undefined> {
  try {
    const item = await request<BResearchReport>(
      `/api/v1/research/reports/${encodeURIComponent(id)}`,
    );
    return mapResearchReport(item);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchResearchNotes(): Promise<ResearchNote[]> {
  const items = await request<BResearchNote[]>("/api/v1/research/notes");
  return items.map(mapResearchNote);
}

export async function fetchResearchNote(id: string): Promise<ResearchNote | undefined> {
  try {
    const item = await request<BResearchNote>(`/api/v1/research/notes/${encodeURIComponent(id)}`);
    return mapResearchNote(item);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function fetchActivities(): Promise<Activity[]> {
  const activities = await request<BActivity[]>("/api/v1/activities");
  return activities.map(mapActivity);
}

export async function fetchPower(nodeId: string): Promise<PowerStatus> {
  const power = await request<BPower>(`/api/v1/nodes/${nodeId}/power`);
  return mapPower(power);
}

/** Exchange the device access_token for a short-lived SSE ticket. */
export async function fetchSseTicket(): Promise<string> {
  const res = await request<{ token: string; expires_in_seconds: number }>(
    "/api/v1/auth/sse-ticket",
  );
  return res.token;
}

export async function sendCommand(input: {
  nodeId: string;
  target: string;
  action: string;
  parameters?: Record<string, unknown>;
}): Promise<Command> {
  const payload: Record<string, unknown> = { node_id: input.nodeId, command: input.action };
  if (input.parameters && Object.keys(input.parameters).length > 0) {
    payload.target = input.parameters;
  }
  const command = await request<BCommand>("/api/v1/commands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapCommand(command);
}