import { describe, expect, it } from "vitest";

import {
  mapDataset,
  mapExperiment,
  mapPaper,
  mapResearchNote,
  mapResearchProject,
  mapResearchReport,
} from "@/lib/backend";
import {
  isResearchType,
  toResearchDetailFields,
  toResearchListItem,
} from "@/lib/research";
import {
  datasetStatus,
  experimentStatus,
  paperStatus,
  researchProjectStatus,
  researchReportStatus,
} from "@/lib/status";
import type { Experiment, Paper, ResearchNote, ResearchProject } from "@/types";

function projectRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "research-g1",
    name: "G1 Motion Control",
    description: "RL locomotion",
    status: "active",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-09-03T09:40:00Z",
    project_id: null,
    repository_path: null,
    tags: ["G1", "RL"],
    metadata: { demo: true },
    ...overrides,
  };
}

function paperRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "paper-gvhmr",
    title: "Generalizable Human Motion Reconstruction",
    authors: ["A. Author", "B. Author"],
    year: 2023,
    venue: "arXiv",
    doi: "10.48550/x",
    url: null,
    pdf_path: "papers/gvhmr.pdf",
    status: "unread",
    tags: ["HMR"],
    notes: null,
    research_project_id: "research-g1",
    created_at: "2026-08-06T10:00:00Z",
    updated_at: "2026-08-06T10:00:00Z",
    ...overrides,
  };
}

function datasetRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "ds-mocap",
    name: "Humanoid Motion Capture Clips",
    description: null,
    path: "/Volumes/Research/mocap/v3",
    size_bytes: 697932185600,
    format: "mocap",
    source: "Vicon",
    version: "v3",
    status: "available",
    research_project_id: "research-g1",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-29T10:00:00Z",
    ...overrides,
  };
}

function experimentRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "exp-g1-terrain",
    name: "Terrain curriculum",
    description: null,
    research_project_id: "research-g1",
    status: "running",
    started_at: "2026-09-02T12:00:00Z",
    ended_at: null,
    dataset_id: "ds-mocap",
    command: "python train.py --env g1 --terrain",
    result: null,
    metrics: { policy_iter: 42000 },
    artifact_path: null,
    created_at: "2026-09-02T12:00:00Z",
    updated_at: "2026-09-03T09:50:00Z",
    ...overrides,
  };
}

function reportRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "rep-weekly",
    title: "Weekly Research Digest",
    description: null,
    path: "reports/weekly.md",
    format: "markdown",
    research_project_id: "research-g1",
    status: "draft",
    created_at: "2026-09-03T08:00:00Z",
    updated_at: "2026-09-03T08:00:00Z",
    ...overrides,
  };
}

function noteRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-reading",
    title: "Reading list",
    content: "Curated queue",
    research_project_id: "research-g1",
    tags: ["reading"],
    created_at: "2026-09-01T09:00:00Z",
    updated_at: "2026-09-03T02:00:00Z",
    ...overrides,
  };
}

describe("research mappers (snake_case → camelCase)", () => {
  it("maps ResearchProject incl. metadata and null project_id", () => {
    const p = mapResearchProject(projectRaw());
    expect(p.id).toBe("research-g1");
    expect(p.name).toBe("G1 Motion Control");
    expect(p.status).toBe("active");
    expect(p.createdAt).toBe("2026-08-01T10:00:00Z");
    expect(p.projectId).toBeUndefined(); // null → undefined
    expect(p.repositoryPath).toBeUndefined();
    expect(p.tags).toEqual(["G1", "RL"]);
    expect(p.metadata).toEqual({ demo: true });
  });

  it("maps Paper incl. authors/doi/pdf and nullable fields", () => {
    const p = mapPaper(paperRaw());
    expect(p.title).toBe("Generalizable Human Motion Reconstruction");
    expect(p.authors).toEqual(["A. Author", "B. Author"]);
    expect(p.year).toBe(2023);
    expect(p.venue).toBe("arXiv");
    expect(p.doi).toBe("10.48550/x");
    expect(p.url).toBeUndefined(); // null → undefined
    expect(p.pdfPath).toBe("papers/gvhmr.pdf");
    expect(p.status).toBe("unread");
    expect(p.researchProjectId).toBe("research-g1");
    expect(p.notes).toBeUndefined();
  });

  it("maps Dataset incl. size_bytes → sizeBytes", () => {
    const d = mapDataset(datasetRaw());
    expect(d.name).toBe("Humanoid Motion Capture Clips");
    expect(d.sizeBytes).toBe(697932185600);
    expect(d.format).toBe("mocap");
    expect(d.source).toBe("Vicon");
    expect(d.version).toBe("v3");
    expect(d.status).toBe("available");
    expect(d.researchProjectId).toBe("research-g1");
    expect(d.description).toBeUndefined();
  });

  it("maps Experiment incl. command/metrics and nullable ended_at", () => {
    const e = mapExperiment(experimentRaw());
    expect(e.name).toBe("Terrain curriculum");
    expect(e.status).toBe("running");
    expect(e.startedAt).toBe("2026-09-02T12:00:00Z");
    expect(e.endedAt).toBeUndefined();
    expect(e.command).toBe("python train.py --env g1 --terrain");
    expect(e.metrics).toEqual({ policy_iter: 42000 });
    expect(e.datasetId).toBe("ds-mocap");
    expect(e.result).toBeUndefined();
  });

  it("maps ResearchReport incl. format and status", () => {
    const r = mapResearchReport(reportRaw());
    expect(r.title).toBe("Weekly Research Digest");
    expect(r.format).toBe("markdown");
    expect(r.status).toBe("draft");
    expect(r.researchProjectId).toBe("research-g1");
    expect(r.description).toBeUndefined();
  });

  it("maps ResearchNote incl. tags and content", () => {
    const n = mapResearchNote(noteRaw());
    expect(n.title).toBe("Reading list");
    expect(n.content).toBe("Curated queue");
    expect(n.tags).toEqual(["reading"]);
    expect(n.researchProjectId).toBe("research-g1");
  });
});

describe("research registry helpers", () => {
  it("isResearchType accepts the six keys and rejects others", () => {
    for (const key of ["projects", "papers", "datasets", "experiments", "reports", "notes"]) {
      expect(isResearchType(key)).toBe(true);
    }
    expect(isResearchType("bogus")).toBe(false);
    expect(isResearchType("")).toBe(false);
  });

  it("toResearchListItem normalizes a paper (status + subtitle + tags)", () => {
    const paper: Paper = mapPaper(paperRaw());
    const li = toResearchListItem("papers", paper);
    expect(li.id).toBe("paper-gvhmr");
    expect(li.title).toBe("Generalizable Human Motion Reconstruction");
    expect(li.status?.tone).toBe("neutral"); // unread
    expect(li.subtitle).toBe("2023 · arXiv");
    expect(li.tags).toEqual(["HMR"]);
    expect(li.updatedAt).toBe("2026-08-06T10:00:00Z");
  });

  it("toResearchListItem has no status for notes and uses content as subtitle", () => {
    const note: ResearchNote = mapResearchNote(noteRaw());
    const li = toResearchListItem("notes", note);
    expect(li.status).toBeNull();
    expect(li.subtitle).toBe("Curated queue");
  });

  it("toResearchDetailFields resolves project/dataset names", () => {
    const experiment: Experiment = mapExperiment(experimentRaw());
    const fields = toResearchDetailFields("experiments", experiment, {
      researchProjectName: (id) => (id === "research-g1" ? "G1 Motion Control" : undefined),
      datasetName: (id) => (id === "ds-mocap" ? "Humanoid Motion Capture Clips" : undefined),
    });
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey["label.project"].value).toBe("G1 Motion Control");
    expect(byKey["label.dataset"].value).toBe("Humanoid Motion Capture Clips");
    expect(byKey["label.command"].value).toBe("python train.py --env g1 --terrain");
    expect(byKey["label.metrics"].value).toBe('{"policy_iter":42000}');
  });

  it("toResearchDetailFields marks missing metrics and missing code project", () => {
    const experiment: Experiment = mapExperiment(experimentRaw({ metrics: null }));
    const fields = toResearchDetailFields("experiments", experiment, {});
    const metrics = fields.find((f) => f.key === "label.metrics");
    expect(metrics?.valueKey).toBe("research.noMetrics");

    const project: ResearchProject = mapResearchProject(projectRaw());
    const pFields = toResearchDetailFields("projects", project, {});
    const code = pFields.find((f) => f.key === "label.codeProject");
    expect(code?.valueKey).toBe("research.noLinkedCode");
  });
});

describe("research status tones", () => {
  it("research project tones", () => {
    expect(researchProjectStatus("active").tone).toBe("info");
    expect(researchProjectStatus("paused").tone).toBe("warning");
    expect(researchProjectStatus("completed").tone).toBe("success");
    expect(researchProjectStatus("archived").tone).toBe("neutral");
  });

  it("paper tones", () => {
    expect(paperStatus("unread").tone).toBe("neutral");
    expect(paperStatus("reading").tone).toBe("info");
    expect(paperStatus("read").tone).toBe("success");
    expect(paperStatus("archived").tone).toBe("neutral");
  });

  it("dataset tones", () => {
    expect(datasetStatus("available").tone).toBe("success");
    expect(datasetStatus("missing").tone).toBe("error");
    expect(datasetStatus("archived").tone).toBe("neutral");
  });

  it("experiment tones", () => {
    expect(experimentStatus("planned").tone).toBe("neutral");
    expect(experimentStatus("running").tone).toBe("info");
    expect(experimentStatus("completed").tone).toBe("success");
    expect(experimentStatus("failed").tone).toBe("error");
    expect(experimentStatus("cancelled").tone).toBe("warning");
  });

  it("report tones", () => {
    expect(researchReportStatus("draft").tone).toBe("warning");
    expect(researchReportStatus("completed").tone).toBe("success");
    expect(researchReportStatus("archived").tone).toBe("neutral");
  });
});