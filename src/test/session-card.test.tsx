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

import { SessionCard } from "@/components/session/SessionCard";
import { I18nProvider } from "@/lib/i18n";
import type { AgentSession } from "@/types";

const session: AgentSession = {
  id: "coding-agent-session-001",
  agentId: "coding-agent",
  nodeId: "macbook-pro",
  projectId: "coding-video",
  researchProjectId: "research-g1",
  status: "completed",
  startedAt: "2026-09-03T08:00:00Z",
  endedAt: "2026-09-03T08:30:00Z",
  lastActivityAt: "2026-09-03T08:30:00Z",
  currentTask: null,
};

function renderCard(s: AgentSession) {
  return render(
    <I18nProvider>
      <SessionCard session={s} />
    </I18nProvider>,
  );
}

describe("SessionCard", () => {
  it("shows id, agent and status badge", () => {
    renderCard(session);
    expect(screen.getByText("coding-agent-session-001")).toBeInTheDocument();
    expect(screen.getByText("coding-agent")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("links to the session detail page", () => {
    renderCard(session);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/sessions/coding-agent-session-001");
  });

  it("shows project and research association chips", () => {
    renderCard(session);
    expect(screen.getByText("project:coding-video")).toBeInTheDocument();
    expect(screen.getByText("research:research-g1")).toBeInTheDocument();
  });

  it("renders current task when present", () => {
    renderCard({ ...session, currentTask: "Reviewing papers" });
    expect(screen.getByText("Reviewing papers")).toBeInTheDocument();
  });
});