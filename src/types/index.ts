/**
 * Silence Personal Control Center — Shared Domain Types
 *
 * These types define the frontend data contract. Phase 3's FastAPI backend
 * must serialize its responses to match these shapes so the UI can switch
 * from mock data to a real API without structural changes.
 */

/* ------------------------------------------------------------------ */
/* Node                                                                */
/* ------------------------------------------------------------------ */

export type NodeStatus = "online" | "offline" | "sleeping" | "unknown";
export type NodePlatform = "macos" | "linux" | "windows" | "unknown";
export type NodeArchitecture = "arm64" | "x86_64" | "unknown";

export type Capability =
  | "system_metrics"
  | "docker"
  | "docker_read"
  | "git"
  | "git_read"
  | "power_read"
  | "power_sleep"
  | "sleep"
  | "wake"
  | "terminal"
  | "gpu"
  | "training"
  | "simulation"
  | "storage";

export interface NodeHardware {
  chip: string;
  cpuCores: number;
  performanceCores: number;
  efficiencyCores: number;
  memoryGb: number;
  gpu: string;
}

export interface Node {
  id: string;
  name: string;
  model: string;
  platform: NodePlatform;
  architecture: NodeArchitecture;
  status: NodeStatus;
  capabilities: Capability[];
  hardware: NodeHardware;
  osVersion: string;
  ip: string;
  uptime: string;
  lastSeen: string; // ISO-8601
}

export type PowerState = "awake" | "asleep" | "unknown";

export interface PowerStatus {
  state: PowerState;
  battery: number | null;
  charging: boolean | null;
  sleepSupported: boolean;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export interface CpuMetrics {
  usagePct: number;
  loadAvg: number;
  cores: number;
  history: number[]; // recent samples (oldest → newest)
}

export interface MemoryMetrics {
  usedGb: number;
  totalGb: number;
  usagePct: number;
  history: number[];
}

export interface StorageMetrics {
  usedGb: number;
  totalGb: number;
  usagePct: number;
}

export interface NetworkMetrics {
  downMbps: number;
  upMbps: number;
}

export interface SystemMetrics {
  nodeId: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  network: NetworkMetrics;
  temperatureC: number;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Services (incl. Docker containers)                                  */
/* ------------------------------------------------------------------ */

export type ServiceType = "docker" | "process" | "launchd" | "application" | "custom";
export type ServiceStatus = "running" | "stopped" | "degraded" | "unknown";
export type ServiceHealth = "healthy" | "unhealthy" | "unknown";

export interface Service {
  id: string;
  name: string;
  nodeId: string;
  type: ServiceType;
  status: ServiceStatus;
  health: ServiceHealth;
  endpoint?: string;
  port?: number;
  description?: string;
}

export interface DockerSummary {
  running: number;
  stopped: number;
  paused: number;
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type ProjectStatus = "clean" | "modified" | "ahead" | "behind" | "unknown";
export type ProjectActivity = "active" | "idle" | "archived";

/** Aggregated Project health (HEALTHY / DIRTY / ERROR / UNKNOWN). */
export type ProjectHealth = "healthy" | "dirty" | "error" | "unknown";

export type WorkingTree = "clean" | "dirty" | "unknown";

export interface Project {
  id: string;
  name: string;
  nodeId: string;
  repositoryPath: string;
  repositoryType: string; // "git"
  remote?: string;
  branch: string;
  health: ProjectHealth;
  workingTree: WorkingTree;
  modified?: number; // modified/untracked file count
  ahead?: number;
  behind?: number;
  head?: string; // full 40-char HEAD sha
  lastCommitHash: string; // short hash
  lastCommitSubject: string;
  lastCommitTime?: string; // ISO
  activity?: ProjectActivity;
  description?: string;
  tech?: string[];
}

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

export type AgentStatus = "offline" | "idle" | "running" | "error" | "unknown";

export type AgentType =
  | "coding"
  | "research"
  | "robotics"
  | "data"
  | "review"
  | "general";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  status: AgentStatus;
  nodeId: string;
  currentProjectId?: string | null;
  currentSessionId?: string | null;
  currentTask?: string | null;
  lastActivityAt?: string | null; // ISO 8601
  capabilities: string[];
  metadata: Record<string, unknown>;
}

export type SessionStatus =
  | "created"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentSession {
  id: string;
  agentId: string;
  nodeId: string;
  projectId?: string | null;
  // Phase 8: links the Session Plane to a Research Project (Phase 7).
  researchProjectId?: string | null;
  status: SessionStatus;
  startedAt: string; // ISO 8601
  endedAt?: string | null;
  lastActivityAt: string; // ISO 8601
  currentTask?: string | null;
}

/* ------------------------------------------------------------------ */
/* Activity (Event timeline)                                           */
/* ------------------------------------------------------------------ */

export type ActivitySource =
  | "docker"
  | "git"
  | "research"
  | "robotics"
  | "agent"
  | "system"
  | "control";

export type ActivityLevel = "info" | "success" | "warning" | "error";

export interface Activity {
  id: string;
  timestamp: string; // ISO-8601
  source: ActivitySource;
  level: ActivityLevel;
  message: string;
  detail?: string;
  nodeId?: string;
  // Reserved association contract (Phase 6). Null for legacy records; the
  // backend does not persist these until Phase 7.
  projectId?: string | null;
  agentId?: string | null;
  sessionId?: string | null;
  // Phase 8: links the Activity spine to a Research Project (Phase 7).
  researchProjectId?: string | null;
}

/* ------------------------------------------------------------------ */
/* Commands (control operations — UI-only in Phase 2)                  */
/* ------------------------------------------------------------------ */

export type CommandTarget = "power" | "docker" | "service" | "git" | "agent" | "training";
export type CommandStatus = "queued" | "running" | "completed" | "failed" | "rejected";

export interface Command {
  commandId: string;
  nodeId: string;
  target: CommandTarget;
  action: string;
  parameters?: Record<string, unknown>;
  status: CommandStatus;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Storage (Data Center)                                               */
/* ------------------------------------------------------------------ */

export interface StorageCategory {
  key: string;
  label: string;
  sizeGb: number;
}

export interface StorageOverview {
  driveName: string;
  mountPoint: string;
  totalGb: number;
  usedGb: number;
  freeGb: number;
  categories: StorageCategory[];
}

/* ------------------------------------------------------------------ */
/* Research                                                            */
/* ------------------------------------------------------------------ */

export type ResearchProjectStatus = "active" | "paused" | "completed" | "archived";

export type PaperStatus = "unread" | "reading" | "read" | "archived";

export type DatasetStatus = "available" | "missing" | "archived";

export type ResearchExperimentStatus =
  | "planned"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ResearchReportFormat = "markdown" | "pdf" | "html" | "other";

export type ResearchReportStatus = "draft" | "completed" | "archived";

export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  status: ResearchProjectStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  projectId?: string | null; // optional Phase 5 code-project id
  repositoryPath?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface ResearchRuntime {
  exists: boolean;
  missing: boolean;
  sizeBytes?: number | null;
  modifiedAt?: string | null; // ISO 8601
  error?: string | null;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  url?: string | null;
  pdfPath?: string | null;
  status: PaperStatus;
  tags: string[];
  notes?: string | null;
  researchProjectId?: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  runtime?: ResearchRuntime | null; // Phase 8 observation
}

export interface Dataset {
  id: string;
  name: string;
  description?: string | null;
  path?: string | null;
  sizeBytes?: number | null;
  format?: string | null;
  source?: string | null;
  version?: string | null;
  status: DatasetStatus;
  researchProjectId?: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  runtime?: ResearchRuntime | null; // Phase 8 observation
}

export interface Experiment {
  id: string;
  name: string;
  description?: string | null;
  researchProjectId?: string | null;
  status: ResearchExperimentStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  datasetId?: string | null;
  command?: string | null;
  result?: string | null;
  metrics?: Record<string, unknown> | null;
  artifactPath?: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  runtime?: ResearchRuntime | null; // Phase 8 observation
}

export interface ResearchReport {
  id: string;
  title: string;
  description?: string | null;
  path?: string | null;
  format: ResearchReportFormat;
  researchProjectId?: string | null;
  status: ResearchReportStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  runtime?: ResearchRuntime | null; // Phase 8 observation
}

export interface ResearchNote {
  id: string;
  title: string;
  content?: string | null;
  researchProjectId?: string | null;
  tags: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/* ------------------------------------------------------------------ */
/* Robotics                                                            */
/* ------------------------------------------------------------------ */

export type RobotStatus = "ready" | "idle" | "running" | "error" | "offline";

export interface Robot {
  id: string;
  name: string;
  model: string;
  status: RobotStatus;
  currentTask?: string;
  simulation?: string;
  lastRun: string;
}

export type TrainingStatus = "idle" | "running" | "completed" | "failed";

export interface TrainingRun {
  id: string;
  name: string;
  robotId: string;
  environment: string;
  status: TrainingStatus;
  progressPct: number;
  metric?: string;
  updatedAt: string;
}

export type ExperimentStatus = "completed" | "running" | "failed" | "queued";

export interface RoboticsExperiment {
  id: string;
  name: string;
  projectId?: string;
  status: ExperimentStatus;
  summary: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Tasks (dashboard "current tasks" aggregate view)                    */
/* ------------------------------------------------------------------ */

export type TaskKind = "training" | "research" | "review" | "build" | "data";
export type TaskStatus = "running" | "queued" | "paused";

export interface Task {
  id: string;
  name: string;
  kind: TaskKind;
  status: TaskStatus;
  progressPct: number;
  detail?: string;
}