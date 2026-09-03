import type {
  ActivityLevel,
  AgentStatus,
  NodeStatus,
  ProjectActivity,
  ProjectHealth,
  ProjectStatus,
  DatasetStatus,
  PaperStatus,
  ResearchExperimentStatus,
  ResearchProjectStatus,
  ResearchReportStatus,
  RobotStatus,
  ServiceStatus,
  SessionStatus,
  TrainingStatus,
  WorkingTree,
} from "@/types";

/**
 * Status System — one shared visual language for the whole app.
 *
 * Tone semantics (documented once, reused everywhere):
 *   success — online / ready / healthy / clean / completed
 *   info    — actively computing (running task, training, in-progress)
 *   warning — modified / degraded / paused / draft / attention needed
 *   error   — offline / failed / behind / critical
 *   neutral — idle / stopped / archived / unknown
 */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusVisual {
  tone: StatusTone;
  /** Raw status value (e.g. "online") — used as the i18n lookup key. */
  key: string;
  /** English display label (fallback when the UI language is English). */
  label: string;
}

export const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  neutral: "bg-border-strong",
};

export const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  neutral: "text-text-secondary",
};

const nodeTone: Record<NodeStatus, StatusTone> = {
  online: "success",
  offline: "error",
  sleeping: "neutral",
  unknown: "neutral",
};

const serviceTone: Record<ServiceStatus, StatusTone> = {
  running: "success",
  stopped: "neutral",
  degraded: "warning",
  unknown: "neutral",
};

const agentTone: Record<AgentStatus, StatusTone> = {
  offline: "error",
  idle: "neutral",
  running: "info",
  error: "error",
  unknown: "neutral",
};

const sessionTone: Record<SessionStatus, StatusTone> = {
  created: "neutral",
  running: "info",
  completed: "success",
  failed: "error",
  cancelled: "neutral",
};

const projectStatusTone: Record<ProjectStatus, StatusTone> = {
  clean: "success",
  modified: "warning",
  ahead: "info",
  behind: "error",
  unknown: "neutral",
};

const projectActivityTone: Record<ProjectActivity, StatusTone> = {
  active: "success",
  idle: "neutral",
  archived: "neutral",
};

const projectHealthTone: Record<ProjectHealth, StatusTone> = {
  healthy: "success",
  dirty: "warning",
  error: "error",
  unknown: "neutral",
};

const workingTreeTone: Record<WorkingTree, StatusTone> = {
  clean: "success",
  dirty: "warning",
  unknown: "neutral",
};

const robotTone: Record<RobotStatus, StatusTone> = {
  ready: "success",
  idle: "neutral",
  running: "info",
  error: "error",
  offline: "error",
};

const trainingTone: Record<TrainingStatus, StatusTone> = {
  idle: "neutral",
  running: "info",
  completed: "success",
  failed: "error",
};

const researchProjectTone: Record<ResearchProjectStatus, StatusTone> = {
  active: "info",
  paused: "warning",
  completed: "success",
  archived: "neutral",
};

const paperTone: Record<PaperStatus, StatusTone> = {
  unread: "neutral",
  reading: "info",
  read: "success",
  archived: "neutral",
};

const datasetTone: Record<DatasetStatus, StatusTone> = {
  available: "success",
  missing: "error",
  archived: "neutral",
};

const experimentTone: Record<ResearchExperimentStatus, StatusTone> = {
  planned: "neutral",
  running: "info",
  completed: "success",
  failed: "error",
  cancelled: "warning",
};

const researchReportTone: Record<ResearchReportStatus, StatusTone> = {
  draft: "warning",
  completed: "success",
  archived: "neutral",
};

export const activityTone: Record<ActivityLevel, StatusTone> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

function viz(tone: StatusTone, key: string): StatusVisual {
  return { tone, key, label: titleCase(key) };
}

export function nodeStatus(status: NodeStatus): StatusVisual {
  return viz(nodeTone[status], status);
}

export function serviceStatus(status: ServiceStatus): StatusVisual {
  return viz(serviceTone[status], status);
}

export function agentStatus(status: AgentStatus): StatusVisual {
  return viz(agentTone[status], status);
}

export function sessionStatus(status: SessionStatus): StatusVisual {
  return viz(sessionTone[status], status);
}

export function projectStatus(status: ProjectStatus): StatusVisual {
  return viz(projectStatusTone[status], status);
}

export function projectActivity(activity: ProjectActivity): StatusVisual {
  return viz(projectActivityTone[activity], activity);
}

export function projectHealth(health: ProjectHealth): StatusVisual {
  return viz(projectHealthTone[health], health);
}

export function workingTreeStatus(workingTree: WorkingTree): StatusVisual {
  return viz(workingTreeTone[workingTree], workingTree);
}

export function robotStatus(status: RobotStatus): StatusVisual {
  return viz(robotTone[status], status);
}

export function trainingStatus(status: TrainingStatus): StatusVisual {
  return viz(trainingTone[status], status);
}

export function researchProjectStatus(status: ResearchProjectStatus): StatusVisual {
  return viz(researchProjectTone[status], status);
}

export function paperStatus(status: PaperStatus): StatusVisual {
  return viz(paperTone[status], status);
}

export function datasetStatus(status: DatasetStatus): StatusVisual {
  return viz(datasetTone[status], status);
}

export function experimentStatus(status: ResearchExperimentStatus): StatusVisual {
  return viz(experimentTone[status], status);
}

export function researchReportStatus(status: ResearchReportStatus): StatusVisual {
  return viz(researchReportTone[status], status);
}

/** Human-first title casing for status labels ("online" → "Online"). */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}