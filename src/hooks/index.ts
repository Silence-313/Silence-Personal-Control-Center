"use client";

import { useEffect, useRef, useState } from "react";

import * as api from "@/lib/api";

import type {
  Activity,
  Agent,
  AgentSession,
  AutomationRuleState,
  AutomationRun,
  Command,
  ContextData,
  Dataset,
  Experiment,
  HealthSummary,
  KnowledgeItem,
  MetricSample,
  MetricsSummary,
  Node,
  Paper,
  PowerStatus,
  Project,
  ResearchNote,
  ResearchProject,
  ResearchReport,
  Robot,
  RoboticsExperiment,
  Service,
  StorageOverview,
  SystemMetrics,
  Task,
  TrainingRun,
} from "@/types";

import type { ResearchEntity, ResearchTypeKey } from "@/lib/research";

/**
 * Data hooks. Each hook wraps a single API function so components never touch
 * `mock/` or `lib/api` directly. Phase 3 only edits the hook internals.
 */

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
}

/** Medium-frequency REST refresh for data the SSE stream does not push. */
const MEDIUM_REFRESH_MS = 30_000;

function useAsync<T>(fetcher: () => Promise<T>, refreshMs?: number): AsyncState<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((s) => ({ data: s.data, loading: s.data === null, error: null }));
    fetcherRef.current().then(
      (data) => {
        if (active) setState({ data, loading: false, error: null });
      },
      (error) => {
        // Keep stale data on error so the "sleeping" state still shows.
        if (active) setState((s) => ({ data: s.data, loading: false, error }));
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Refetch when the Mac wakes (reachability sleeping → online). Retry a few
  // times: docker/git are slow right after wake, so a single failed refetch
  // must not leave stale data behind.
  useEffect(() => {
    const timers: number[] = [];
    const onWake = () => {
      setTick((t) => t + 1);
      timers.push(window.setTimeout(() => setTick((t) => t + 1), 3000));
      timers.push(window.setTimeout(() => setTick((t) => t + 1), 8000));
    };
    window.addEventListener("silence:wake", onWake);
    return () => {
      window.removeEventListener("silence:wake", onWake);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Medium-frequency polling for data the SSE stream doesn't cover (docker,
  // services, projects, activities, power). Metrics/nodes ride SSE instead.
  useEffect(() => {
    if (!refreshMs) return;
    const id = window.setInterval(() => setTick((t) => t + 1), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);

  return state;
}

export function useNodes() {
  return useAsync<Node[]>(api.getNodes);
}

export function useNode(id: string) {
  return useAsync<Node | undefined>(() => api.getNode(id));
}

export function useMetrics() {
  return useAsync<SystemMetrics>(() => api.getMetrics());
}

export function useServices() {
  return useAsync<Service[]>(api.getServices, MEDIUM_REFRESH_MS);
}

export function useProjects() {
  return useAsync<Project[]>(api.getProjects, MEDIUM_REFRESH_MS);
}

export function useProject(id: string) {
  return useAsync<Project | undefined>(() => api.getProject(id));
}

export function useAgents() {
  return useAsync<Agent[]>(api.getAgents, MEDIUM_REFRESH_MS);
}

export function useAgent(id: string) {
  return useAsync<Agent | undefined>(() => api.getAgent(id));
}

export function useAgentSessions(id: string) {
  return useAsync<AgentSession[]>(() => api.getAgentSessions(id));
}

export function useSessions() {
  return useAsync<AgentSession[]>(api.getSessions, MEDIUM_REFRESH_MS);
}

export function useSession(id: string) {
  return useAsync<AgentSession | undefined>(() => api.getSession(id));
}

export function useActivities() {
  return useAsync<Activity[]>(api.getActivities, MEDIUM_REFRESH_MS);
}

export function useResearchProjects() {
  return useAsync<ResearchProject[]>(api.getResearchProjects, MEDIUM_REFRESH_MS);
}

export function useResearchProject(id: string) {
  return useAsync<ResearchProject | undefined>(() => api.getResearchProject(id));
}

export function usePapers() {
  return useAsync<Paper[]>(api.getPapers, MEDIUM_REFRESH_MS);
}

export function usePaper(id: string) {
  return useAsync<Paper | undefined>(() => api.getPaper(id));
}

export function useDatasets() {
  return useAsync<Dataset[]>(api.getDatasets, MEDIUM_REFRESH_MS);
}

export function useDataset(id: string) {
  return useAsync<Dataset | undefined>(() => api.getDataset(id));
}

export function useExperiments() {
  return useAsync<Experiment[]>(api.getExperiments, MEDIUM_REFRESH_MS);
}

export function useExperiment(id: string) {
  return useAsync<Experiment | undefined>(() => api.getExperiment(id));
}

export function useResearchReports() {
  return useAsync<ResearchReport[]>(api.getResearchReports, MEDIUM_REFRESH_MS);
}

export function useResearchReport(id: string) {
  return useAsync<ResearchReport | undefined>(() => api.getResearchReport(id));
}

export function useResearchNotes() {
  return useAsync<ResearchNote[]>(api.getResearchNotes, MEDIUM_REFRESH_MS);
}

export function useResearchNote(id: string) {
  return useAsync<ResearchNote | undefined>(() => api.getResearchNote(id));
}

/** Fetcher for the dynamic /research/[type] list routes (plain function, no hooks). */
async function fetchResearchListByType(type: ResearchTypeKey): Promise<ResearchEntity[]> {
  switch (type) {
    case "projects":
      return api.getResearchProjects();
    case "papers":
      return api.getPapers();
    case "datasets":
      return api.getDatasets();
    case "experiments":
      return api.getExperiments();
    case "reports":
      return api.getResearchReports();
    case "notes":
      return api.getResearchNotes();
  }
}

/** Fetcher for the dynamic /research/[type]/[id] detail routes. */
async function fetchResearchDetailByType(
  type: ResearchTypeKey,
  id: string,
): Promise<ResearchEntity | undefined> {
  switch (type) {
    case "projects":
      return api.getResearchProject(id);
    case "papers":
      return api.getPaper(id);
    case "datasets":
      return api.getDataset(id);
    case "experiments":
      return api.getExperiment(id);
    case "reports":
      return api.getResearchReport(id);
    case "notes":
      return api.getResearchNote(id);
  }
}

/** Composite hooks for the dynamic /research/[type] routes. */
export function useResearchList(type: ResearchTypeKey): AsyncState<ResearchEntity[]> {
  return useAsync(() => fetchResearchListByType(type), MEDIUM_REFRESH_MS);
}

export function useResearchDetail(
  type: ResearchTypeKey,
  id: string,
): AsyncState<ResearchEntity | undefined> {
  return useAsync(() => fetchResearchDetailByType(type, id));
}

export function useRobots() {
  return useAsync<Robot[]>(api.getRobots);
}

export function useTrainingRuns() {
  return useAsync<TrainingRun[]>(api.getTrainingRuns);
}

export function useRoboticsExperiments() {
  return useAsync<RoboticsExperiment[]>(api.getRoboticsExperiments);
}

export function useStorage() {
  return useAsync<StorageOverview>(api.getStorage);
}

export function useTasks() {
  return useAsync<Task[]>(api.getTasks);
}

export function usePower(nodeId: string) {
  return useAsync<PowerStatus>(() => api.getPower(nodeId), MEDIUM_REFRESH_MS);
}

export function useKnowledgeItems(params?: {
  q?: string;
  type?: string;
  tag?: string;
}) {
  return useAsync<KnowledgeItem[]>(() => api.getKnowledgeItems(params), MEDIUM_REFRESH_MS);
}

/** Aggregated context for one entity (knowledge graph neighbourhood). */
export function useContextData(type: string, id: string) {
  return useAsync<ContextData | undefined>(() => api.getContext(type, id));
}

export function useAutomationRules() {
  return useAsync<AutomationRuleState[]>(api.getAutomationRules, MEDIUM_REFRESH_MS);
}

/* Observability (Phase 10) ------------------------------------------------ */
export function useMetricsHistory(params?: {
  nodeId?: string;
  start?: string;
  end?: string;
  limit?: number;
}) {
  return useAsync<MetricSample[]>(() => api.getMetricsHistory(params), MEDIUM_REFRESH_MS);
}

export function useMetricsSummary(params?: { nodeId?: string; range?: string }) {
  return useAsync<MetricsSummary>(() => api.getMetricsSummary(params), MEDIUM_REFRESH_MS);
}

export function useHealthSummary() {
  return useAsync<HealthSummary>(api.getHealthSummary, MEDIUM_REFRESH_MS);
}

export function useEventTimeline(params?: {
  severity?: string;
  category?: string;
  source?: string;
  limit?: number;
}) {
  return useAsync<Activity[]>(() => api.getEventTimeline(params), MEDIUM_REFRESH_MS);
}

export function useAutomationRuns() {
  return useAsync<AutomationRun[]>(api.getAutomationRuns, MEDIUM_REFRESH_MS);
}

/** Queue a command (mock action) and return the resulting Command object. */
export function useCommand() {
  const [last, setLast] = useState<Command | null>(null);
  const [queued, setQueued] = useState(false);

  const queue = async (input: Parameters<typeof api.sendCommand>[0]) => {
    setQueued(true);
    const command = await api.sendCommand(input);
    setLast(command);
    setQueued(false);
    return command;
  };

  return { queue, last, queued };
}