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

import { ResearchDetail } from "@/components/research/ResearchDetail";
import { ResearchList } from "@/components/research/ResearchList";
import { I18nProvider } from "@/lib/i18n";
import type { ResearchEntity, ResearchTypeKey } from "@/lib/research";
import type { Experiment, Paper, ResearchNote } from "@/types";

function renderList(type: ResearchTypeKey, items: ResearchEntity[]) {
  return render(
    <I18nProvider>
      <ResearchList type={type} items={items} />
    </I18nProvider>,
  );
}

const paper: Paper = {
  id: "paper-gvhmr",
  title: "Generalizable Human Motion Reconstruction",
  authors: ["A. Author", "B. Author"],
  year: 2023,
  venue: "arXiv",
  doi: null,
  url: null,
  pdfPath: null,
  status: "reading",
  tags: ["HMR", "pose"],
  notes: null,
  researchProjectId: "research-g1",
  createdAt: "2026-08-06T10:00:00Z",
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
};

const note: ResearchNote = {
  id: "note-reading",
  title: "Reading list",
  content: "Curated reading queue",
  researchProjectId: "research-g1",
  tags: ["reading"],
  createdAt: "2026-09-01T09:00:00Z",
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
};

const experiment: Experiment = {
  id: "exp-g1-terrain",
  name: "Terrain curriculum",
  description: "Progressive terrain difficulty",
  researchProjectId: "research-g1",
  status: "running",
  startedAt: "2026-09-02T12:00:00Z",
  endedAt: null,
  datasetId: "ds-mocap",
  command: "python train.py --env g1 --terrain",
  result: null,
  metrics: { policy_iter: 42000 },
  artifactPath: null,
  createdAt: "2026-09-02T12:00:00Z",
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
};

describe("ResearchList", () => {
  it("renders paper title, status badge, subtitle and tags", () => {
    renderList("papers", [paper]);
    expect(screen.getByText("Generalizable Human Motion Reconstruction")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("2023 · arXiv")).toBeInTheDocument();
    expect(screen.getByText("HMR")).toBeInTheDocument();
    expect(screen.getByText(/ago$/)).toBeInTheDocument();
  });

  it("renders note without a status badge", () => {
    renderList("notes", [note]);
    expect(screen.getByText("Reading list")).toBeInTheDocument();
    expect(screen.getByText("Curated reading queue")).toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("links each item to its detail route", () => {
    renderList("papers", [paper]);
    expect(screen.getByText("Generalizable Human Motion Reconstruction").closest("a")).toHaveAttribute(
      "href",
      "/research/papers/paper-gvhmr",
    );
  });
});

describe("ResearchDetail", () => {
  it("renders experiment fields with resolved names and command note", () => {
    render(
      <I18nProvider>
        <ResearchDetail
          type="experiments"
          item={experiment}
          resolve={{
            researchProjectName: (id) => (id === "research-g1" ? "G1 Motion Control" : undefined),
            datasetName: (id) => (id === "ds-mocap" ? "Humanoid Motion Capture Clips" : undefined),
          }}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Terrain curriculum")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("python train.py --env g1 --terrain")).toBeInTheDocument();
    expect(screen.getByText("Humanoid Motion Capture Clips")).toBeInTheDocument();
    expect(screen.getByText("G1 Motion Control")).toBeInTheDocument();
    expect(screen.getByText(/display-only/i)).toBeInTheDocument();
  });
});