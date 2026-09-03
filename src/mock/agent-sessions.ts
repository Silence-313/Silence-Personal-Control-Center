import type { AgentSession } from "@/types";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const agentSessions: AgentSession[] = [
  {
    id: "coding-agent-session-001",
    agentId: "coding-agent",
    nodeId: "macbook-pro",
    projectId: "g1-mechdance",
    researchProjectId: null,
    status: "completed",
    startedAt: ago(60 * 24),
    endedAt: ago(60 * 23),
    lastActivityAt: ago(60 * 23),
    currentTask: null,
  },
  {
    id: "research-agent-session-001",
    agentId: "research-agent",
    nodeId: "macbook-pro",
    projectId: "second-brain",
    researchProjectId: null,
    status: "completed",
    startedAt: ago(60 * 30),
    endedAt: ago(60 * 28),
    lastActivityAt: ago(60 * 28),
    currentTask: null,
  },
  {
    id: "research-agent-session-002",
    agentId: "research-agent",
    nodeId: "macbook-pro",
    projectId: "second-brain",
    researchProjectId: null,
    status: "running",
    startedAt: ago(40),
    endedAt: null,
    lastActivityAt: ago(0.5),
    currentTask: "Reviewing 3 papers on humanoid locomotion",
  },
  {
    id: "data-agent-session-001",
    agentId: "data-agent",
    nodeId: "macbook-pro",
    projectId: null,
    researchProjectId: null,
    status: "failed",
    startedAt: ago(60 * 20),
    endedAt: ago(60 * 19),
    lastActivityAt: ago(60 * 19),
    currentTask: null,
  },
];