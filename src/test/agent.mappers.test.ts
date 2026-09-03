import { describe, expect, it } from "vitest";

import { mapActivity, mapAgent, mapAgentSession } from "@/lib/backend";

describe("mapAgent (snake_case agent → Agent)", () => {
  const raw = {
    id: "coding-agent",
    name: "Coding Agent",
    type: "coding",
    description: "Coding task orchestration",
    status: "idle",
    node_id: "macbook-pro",
    current_project_id: "coding-video",
    current_session_id: null,
    current_task: null,
    last_activity_at: "2026-09-03T08:00:00Z",
    capabilities: ["code_analysis", "code_generation", "testing"],
    metadata: { owner: "me" },
  };

  it("maps identity, status and association", () => {
    const a = mapAgent(raw);
    expect(a.id).toBe("coding-agent");
    expect(a.name).toBe("Coding Agent");
    expect(a.type).toBe("coding");
    expect(a.status).toBe("idle");
    expect(a.nodeId).toBe("macbook-pro");
    expect(a.currentProjectId).toBe("coding-video");
    expect(a.currentSessionId).toBeUndefined();
    expect(a.currentTask).toBeUndefined();
    expect(a.lastActivityAt).toBe("2026-09-03T08:00:00Z");
  });

  it("preserves capabilities and metadata", () => {
    const a = mapAgent(raw);
    expect(a.capabilities).toEqual(["code_analysis", "code_generation", "testing"]);
    expect(a.metadata).toEqual({ owner: "me" });
  });

  it("defaults missing type/status/capabilities/metadata", () => {
    const a = mapAgent({
      ...raw,
      type: undefined,
      status: undefined,
      capabilities: undefined,
      metadata: undefined,
    });
    expect(a.type).toBe("general");
    expect(a.status).toBe("unknown");
    expect(a.capabilities).toEqual([]);
    expect(a.metadata).toEqual({});
  });
});

describe("mapAgentSession (snake_case session → AgentSession)", () => {
  const raw = {
    id: "s1",
    agent_id: "coding-agent",
    node_id: "macbook-pro",
    project_id: "coding-video",
    research_project_id: null,
    status: "completed",
    started_at: "2026-09-03T08:00:00Z",
    ended_at: "2026-09-03T08:30:00Z",
    last_activity_at: "2026-09-03T08:30:00Z",
    current_task: null,
  };

  it("maps session fields", () => {
    const s = mapAgentSession(raw);
    expect(s.id).toBe("s1");
    expect(s.agentId).toBe("coding-agent");
    expect(s.nodeId).toBe("macbook-pro");
    expect(s.projectId).toBe("coding-video");
    expect(s.status).toBe("completed");
    expect(s.startedAt).toBe("2026-09-03T08:00:00Z");
    expect(s.endedAt).toBe("2026-09-03T08:30:00Z");
    expect(s.lastActivityAt).toBe("2026-09-03T08:30:00Z");
    expect(s.currentTask).toBeUndefined();
  });

  it("defaults status and omits null-ended sessions", () => {
    const s = mapAgentSession({ ...raw, status: undefined, ended_at: null });
    expect(s.status).toBe("created");
    expect(s.endedAt).toBeUndefined();
  });

  it("maps researchProjectId when present, omits when null", () => {
    expect(
      mapAgentSession({ ...raw, research_project_id: "rp-1" }).researchProjectId,
    ).toBe("rp-1");
    expect(
      mapAgentSession({ ...raw, research_project_id: null }).researchProjectId,
    ).toBeUndefined();
  });
});

describe("mapActivity (nullable project/agent/session association)", () => {
  it("maps the association ids when present", () => {
    const a = mapActivity({
      id: "e1",
      type: "agent",
      action: "idle",
      message: "Coding Agent went idle",
      timestamp: "2026-09-03T08:00:00Z",
      node_id: null,
      command_id: null,
      project_id: "coding-video",
      agent_id: "coding-agent",
      session_id: "coding-agent-session-001",
      research_project_id: "research-g1",
    });
    expect(a.projectId).toBe("coding-video");
    expect(a.agentId).toBe("coding-agent");
    expect(a.sessionId).toBe("coding-agent-session-001");
    expect(a.researchProjectId).toBe("research-g1");
    expect(a.source).toBe("agent");
  });

  it("omits association fields for legacy (null) records", () => {
    const a = mapActivity({
      id: "e2",
      type: "system",
      action: "init",
      message: "boot",
      timestamp: "2026-09-03T08:00:00Z",
      node_id: "macbook-pro",
      command_id: null,
      project_id: null,
      agent_id: null,
      session_id: null,
      research_project_id: null,
    });
    expect(a.projectId).toBeUndefined();
    expect(a.agentId).toBeUndefined();
    expect(a.sessionId).toBeUndefined();
    expect(a.researchProjectId).toBeUndefined();
    expect(a.nodeId).toBe("macbook-pro");
  });
});