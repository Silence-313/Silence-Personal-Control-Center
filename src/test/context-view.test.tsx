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

import { ContextView } from "@/components/knowledge/ContextView";
import { I18nProvider } from "@/lib/i18n";
import type { ContextData } from "@/types";

const context: ContextData = {
  type: "paper",
  id: "paper-gvhmr",
  entity: {
    id: "paper-gvhmr",
    title: "Generalizable Human Motion Reconstruction",
    type: "paper",
  },
  relations: [
    {
      id: "paper:paper-gvhmr|belongs_to|research:research-gvhmr",
      sourceId: "paper:paper-gvhmr",
      targetId: "research:research-gvhmr",
      relationType: "belongs_to",
      createdAt: "2026-09-01T10:00:00Z",
    },
  ],
  projects: [],
  agents: [
    {
      id: "research-agent",
      name: "Research Agent",
      type: "research",
      description: "Literature and paper tracking",
      status: "idle",
      nodeId: "macbook-pro",
      currentProjectId: null,
      currentSessionId: null,
      currentTask: null,
      lastActivityAt: null,
      capabilities: ["papers"],
      metadata: {},
    },
  ],
  sessions: [],
  researchProjects: [
    {
      id: "research-gvhmr",
      name: "GVHMR Motion Reconstruction",
      description: "Generalizable motion reconstruction research",
      status: "active",
      createdAt: "2026-08-05T10:00:00Z",
      updatedAt: "2026-09-03T10:00:00Z",
      projectId: null,
      repositoryPath: null,
      tags: ["HMR"],
      metadata: {},
    },
  ],
  papers: [],
  datasets: [],
  experiments: [],
  reports: [],
  notes: [],
  activities: [
    {
      id: "act-1",
      timestamp: "2026-09-01T12:00:00Z",
      source: "research",
      level: "info",
      message: "Paper indexed",
    },
  ],
  generatedAt: "2026-09-04T10:00:00Z",
};

describe("ContextView", () => {
  it("renders entity title, type badge, relations and related agents/research", () => {
    render(
      <I18nProvider>
        <ContextView context={context} />
      </I18nProvider>,
    );

    expect(screen.getByText("Generalizable Human Motion Reconstruction")).toBeInTheDocument();
    expect(screen.getByText("Paper")).toBeInTheDocument();

    // Relation: source → "belongs to" → target
    expect(screen.getByText("paper-gvhmr")).toBeInTheDocument();
    expect(screen.getByText("belongs to")).toBeInTheDocument();
    expect(screen.getByText("research-gvhmr")).toBeInTheDocument();

    // Related agent and research project
    expect(screen.getByText("Research Agent")).toBeInTheDocument();
    expect(screen.getByText("GVHMR Motion Reconstruction")).toBeInTheDocument();

    // Related activity message
    expect(screen.getByText("Paper indexed")).toBeInTheDocument();
  });

  it("shows an empty-relations message when there are none", () => {
    render(
      <I18nProvider>
        <ContextView context={{ ...context, relations: [] }} />
      </I18nProvider>,
    );
    expect(screen.getByText("No relations")).toBeInTheDocument();
  });
});