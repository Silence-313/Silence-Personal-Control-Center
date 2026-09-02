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

export type AgentStatus = "idle" | "running" | "error" | "paused" | "offline";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask?: string;
  lastSession: string;
  lastActivity: string;
  nodeId: string;
  model?: string;
  progressPct?: number;
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

export type ResearchType =
  | "papers"
  | "projects"
  | "experiments"
  | "notes"
  | "datasets"
  | "reports";

export type ResearchStatus = "active" | "draft" | "completed" | "archived";

export interface ResearchItem {
  id: string;
  type: ResearchType;
  title: string;
  summary?: string;
  tags?: string[];
  updatedAt: string;
  status: ResearchStatus;
  projectId?: string;
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