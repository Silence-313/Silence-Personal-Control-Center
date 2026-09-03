import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => {
  const MockLink = (props: Record<string, unknown>) => {
    const { href, children, ...rest } = props;
    return (
      <a href={href as string} {...rest}>
        {children as React.ReactNode}
      </a>
    );
  };
  return { default: MockLink };
});

import { AgentCard } from "@/components/agent/AgentCard";
import { AgentList } from "@/components/agent/AgentList";
import { I18nProvider } from "@/lib/i18n";
import type { Agent } from "@/types";

const agent: Agent = {
  id: "coding-agent",
  name: "Coding Agent",
  type: "coding",
  description: "Coding task orchestration",
  status: "idle",
  nodeId: "macbook-pro",
  currentProjectId: "g1-mechdance",
  currentSessionId: null,
  currentTask: null,
  lastActivityAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  capabilities: ["code_analysis", "code_generation", "testing"],
  metadata: {},
};

function renderAgentList(agents: Agent[]) {
  return render(
    <I18nProvider>
      <AgentList agents={agents} />
    </I18nProvider>,
  );
}

function renderAgentCard(a: Agent, nodeName?: string, projectName?: string) {
  return render(
    <I18nProvider>
      <AgentCard agent={a} nodeName={nodeName} projectName={projectName} />
    </I18nProvider>,
  );
}

describe("AgentList", () => {
  it("shows name and idle status", () => {
    renderAgentList([agent]);
    expect(screen.getByText("Coding Agent")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });

  it("shows running status and current task", () => {
    renderAgentList([{ ...agent, status: "running", currentTask: "Reviewing 3 papers" }]);
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Reviewing 3 papers")).toBeInTheDocument();
  });

  it("renders unknown as its own badge (not offline)", () => {
    renderAgentList([{ ...agent, status: "unknown" }]);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
  });
});

describe("AgentCard", () => {
  it("shows resolved node/project names, capabilities and last activity", () => {
    renderAgentCard(agent, "MacBook Pro", "G1 MechDance");
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("G1 MechDance")).toBeInTheDocument();
    expect(screen.getByText("Code Analysis")).toBeInTheDocument();
    expect(screen.getByText("Code Generation")).toBeInTheDocument();
    expect(screen.getByText("Testing")).toBeInTheDocument();
    expect(screen.getByText(/ago$/)).toBeInTheDocument();
  });

  it("falls back to raw node id and em-dash for unassociated fields", () => {
    renderAgentCard({ ...agent, currentProjectId: null, currentSessionId: null });
    expect(screen.getByText("macbook-pro")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});