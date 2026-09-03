import type {
  Dataset,
  Experiment,
  Paper,
  ResearchNote,
  ResearchProject,
  ResearchReport,
  ResearchRuntime,
} from "@/types";
import { formatRelativeAgo } from "@/lib/format";
import {
  datasetStatus,
  experimentStatus,
  paperStatus,
  researchProjectStatus,
  researchReportStatus,
  type StatusVisual,
} from "@/lib/status";

export const RESEARCH_TYPE_KEYS = [
  "projects",
  "papers",
  "datasets",
  "experiments",
  "reports",
  "notes",
] as const;

export type ResearchTypeKey = (typeof RESEARCH_TYPE_KEYS)[number];

export type ResearchEntity = (
  | ResearchProject
  | Paper
  | Dataset
  | Experiment
  | ResearchReport
  | ResearchNote
) & { runtime?: ResearchRuntime | null };

export function isResearchType(value: string): value is ResearchTypeKey {
  return (RESEARCH_TYPE_KEYS as readonly string[]).includes(value);
}

export interface ResearchMeta {
  labelKey: string; // i18n key ("type.projects" ...)
  plural: string; // English plural
  singular: string; // English singular
}

export const RESEARCH_META: Record<ResearchTypeKey, ResearchMeta> = {
  projects: { labelKey: "type.projects", plural: "Projects", singular: "Project" },
  papers: { labelKey: "type.papers", plural: "Papers", singular: "Paper" },
  datasets: { labelKey: "type.datasets", plural: "Datasets", singular: "Dataset" },
  experiments: { labelKey: "type.experiments", plural: "Experiments", singular: "Experiment" },
  reports: { labelKey: "type.reports", plural: "Reports", singular: "Report" },
  notes: { labelKey: "type.notes", plural: "Notes", singular: "Note" },
};

/** What the list/detail presenter needs to resolve relationships. */
export interface ResearchResolvers {
  codeProjectName?: (id: string) => string | undefined;
  researchProjectName?: (id: string) => string | undefined;
  datasetName?: (id: string) => string | undefined;
}

export interface ResearchListItem {
  id: string;
  title: string;
  status: StatusVisual | null;
  subtitle?: string;
  tags: string[];
  updatedAt: string;
  runtime?: ResearchRuntime | null;
}

/** Frontend-derived runtime badge state (backend gives raw facts only). */
export type RuntimeState = "exists" | "missing" | "error" | "stale";

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function runtimeStateOf(runtime?: ResearchRuntime | null): RuntimeState {
  if (!runtime) return "missing";
  if (runtime.error) return "error";
  if (!runtime.exists) return "missing";
  if (
    runtime.modifiedAt &&
    Date.now() - new Date(runtime.modifiedAt).getTime() > STALE_AFTER_MS
  ) {
    return "stale";
  }
  return "exists";
}

export interface ResearchField {
  key: string; // i18n key
  fallback: string; // English fallback label
  value: string; // rendered text
  valueKey?: string; // when set, `value` is itself an i18n key
}

export function formatBytes(bytes: number): string {
  const gb = bytes / 2 ** 30;
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB`;
}

function titleOf(type: ResearchTypeKey, item: ResearchEntity): string {
  switch (type) {
    case "projects":
      return (item as ResearchProject).name;
    case "papers":
      return (item as Paper).title;
    case "datasets":
      return (item as Dataset).name;
    case "experiments":
      return (item as Experiment).name;
    case "reports":
      return (item as ResearchReport).title;
    case "notes":
      return (item as ResearchNote).title;
  }
}

function statusOf(type: ResearchTypeKey, item: ResearchEntity): StatusVisual | null {
  switch (type) {
    case "projects":
      return researchProjectStatus((item as ResearchProject).status);
    case "papers":
      return paperStatus((item as Paper).status);
    case "datasets":
      return datasetStatus((item as Dataset).status);
    case "experiments":
      return experimentStatus((item as Experiment).status);
    case "reports":
      return researchReportStatus((item as ResearchReport).status);
    case "notes":
      return null;
  }
}

function subtitleOf(type: ResearchTypeKey, item: ResearchEntity): string | undefined {
  switch (type) {
    case "projects":
      return (item as ResearchProject).description || undefined;
    case "papers": {
      const p = item as Paper;
      const parts = [p.year ? String(p.year) : null, p.venue].filter(Boolean);
      return parts.length ? parts.join(" · ") : p.authors.join(", ") || undefined;
    }
    case "datasets": {
      const d = item as Dataset;
      return [d.format, d.sizeBytes != null ? formatBytes(d.sizeBytes) : null]
        .filter(Boolean)
        .join(" · ") || undefined;
    }
    case "experiments":
      return (item as Experiment).description || undefined;
    case "reports":
      return (item as ResearchReport).format || undefined;
    case "notes":
      return (item as ResearchNote).content || undefined;
  }
}

function tagsOf(type: ResearchTypeKey, item: ResearchEntity): string[] {
  switch (type) {
    case "projects":
      return (item as ResearchProject).tags;
    case "papers":
      return (item as Paper).tags;
    case "notes":
      return (item as ResearchNote).tags;
    default:
      return [];
  }
}

export function toResearchListItem(
  type: ResearchTypeKey,
  item: ResearchEntity,
): ResearchListItem {
  return {
    id: item.id,
    title: titleOf(type, item),
    status: statusOf(type, item),
    subtitle: subtitleOf(type, item),
    tags: tagsOf(type, item),
    updatedAt: item.updatedAt,
    runtime: item.runtime,
  };
}

export function toResearchDetailFields(
  type: ResearchTypeKey,
  item: ResearchEntity,
  resolve: ResearchResolvers = {},
): ResearchField[] {
  const project = (id?: string | null) =>
    id ? (resolve.researchProjectName?.(id) ?? id) : "—";
  const codeProject = (id?: string | null) =>
    !id ? undefined : resolve.codeProjectName?.(id) ?? id;

  switch (type) {
    case "projects": {
      const p = item as ResearchProject;
      const cp = codeProject(p.projectId);
      return [
        { key: "label.description", fallback: "Description", value: p.description || "—" },
        {
          key: "label.codeProject",
          fallback: "Code Project",
          value: cp ?? "No linked code project",
          valueKey: cp ? undefined : "research.noLinkedCode",
        },
        { key: "label.repositoryPath", fallback: "Repository Path", value: p.repositoryPath ?? "—" },
        { key: "label.tags", fallback: "Tags", value: p.tags.join(", ") || "—" },
        { key: "label.created", fallback: "Created", value: formatRelativeAgo(p.createdAt) },
        { key: "label.updatedAt", fallback: "Updated", value: formatRelativeAgo(p.updatedAt) },
        {
          key: "label.metadata",
          fallback: "Metadata",
          value: Object.keys(p.metadata).length ? JSON.stringify(p.metadata) : "—",
        },
      ];
    }
    case "papers": {
      const p = item as Paper;
      return [
        { key: "label.authors", fallback: "Authors", value: p.authors.join(", ") || "—" },
        { key: "label.year", fallback: "Year", value: p.year != null ? String(p.year) : "—" },
        { key: "label.venue", fallback: "Venue", value: p.venue ?? "—" },
        { key: "label.doi", fallback: "DOI", value: p.doi ?? "—" },
        { key: "label.url", fallback: "URL", value: p.url ?? "—" },
        { key: "label.pdfPath", fallback: "PDF Path", value: p.pdfPath ?? "—" },
        { key: "label.tags", fallback: "Tags", value: p.tags.join(", ") || "—" },
        { key: "label.notes", fallback: "Notes", value: p.notes ?? "—" },
        { key: "label.project", fallback: "Research Project", value: project(p.researchProjectId) },
        { key: "label.created", fallback: "Created", value: formatRelativeAgo(p.createdAt) },
        { key: "label.updatedAt", fallback: "Updated", value: formatRelativeAgo(p.updatedAt) },
      ];
    }
    case "datasets": {
      const d = item as Dataset;
      return [
        { key: "label.description", fallback: "Description", value: d.description ?? "—" },
        { key: "label.path", fallback: "Path", value: d.path ?? "—" },
        {
          key: "label.size",
          fallback: "Size",
          value: d.sizeBytes != null ? formatBytes(d.sizeBytes) : "—",
        },
        { key: "label.format", fallback: "Format", value: d.format ?? "—" },
        { key: "label.source", fallback: "Source", value: d.source ?? "—" },
        { key: "label.version", fallback: "Version", value: d.version ?? "—" },
        { key: "label.project", fallback: "Research Project", value: project(d.researchProjectId) },
        { key: "label.created", fallback: "Created", value: formatRelativeAgo(d.createdAt) },
        { key: "label.updatedAt", fallback: "Updated", value: formatRelativeAgo(d.updatedAt) },
      ];
    }
    case "experiments": {
      const e = item as Experiment;
      const dataset = e.datasetId
        ? (resolve.datasetName?.(e.datasetId) ?? e.datasetId)
        : "—";
      return [
        { key: "label.description", fallback: "Description", value: e.description ?? "—" },
        { key: "label.project", fallback: "Research Project", value: project(e.researchProjectId) },
        { key: "label.dataset", fallback: "Dataset", value: dataset },
        { key: "label.started", fallback: "Started", value: e.startedAt ? formatRelativeAgo(e.startedAt) : "—" },
        { key: "label.ended", fallback: "Ended", value: e.endedAt ? formatRelativeAgo(e.endedAt) : "—" },
        { key: "label.command", fallback: "Command", value: e.command ?? "—" },
        { key: "label.result", fallback: "Result", value: e.result ?? "—" },
        {
          key: "label.metrics",
          fallback: "Metrics",
          value:
            e.metrics && Object.keys(e.metrics).length ? JSON.stringify(e.metrics) : "No metrics",
          valueKey:
            e.metrics && Object.keys(e.metrics).length ? undefined : "research.noMetrics",
        },
        { key: "label.artifactPath", fallback: "Artifact Path", value: e.artifactPath ?? "—" },
        { key: "label.created", fallback: "Created", value: formatRelativeAgo(e.createdAt) },
        { key: "label.updatedAt", fallback: "Updated", value: formatRelativeAgo(e.updatedAt) },
      ];
    }
    case "reports": {
      const r = item as ResearchReport;
      return [
        { key: "label.description", fallback: "Description", value: r.description ?? "—" },
        { key: "label.path", fallback: "Path", value: r.path ?? "—" },
        { key: "label.format", fallback: "Format", value: r.format ?? "—" },
        { key: "label.project", fallback: "Research Project", value: project(r.researchProjectId) },
        { key: "label.created", fallback: "Created", value: formatRelativeAgo(r.createdAt) },
        { key: "label.updatedAt", fallback: "Updated", value: formatRelativeAgo(r.updatedAt) },
      ];
    }
    case "notes": {
      const n = item as ResearchNote;
      return [
        { key: "label.content", fallback: "Content", value: n.content ?? "—" },
        { key: "label.project", fallback: "Research Project", value: project(n.researchProjectId) },
        { key: "label.tags", fallback: "Tags", value: n.tags.join(", ") || "—" },
        { key: "label.created", fallback: "Created", value: formatRelativeAgo(n.createdAt) },
        { key: "label.updatedAt", fallback: "Updated", value: formatRelativeAgo(n.updatedAt) },
      ];
    }
  }
}