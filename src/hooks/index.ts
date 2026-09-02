"use client";

import { useEffect, useRef, useState } from "react";

import * as api from "@/lib/api";

import type {
  Activity,
  Agent,
  Command,
  Node,
  PowerStatus,
  Project,
  ResearchItem,
  Robot,
  RoboticsExperiment,
  Service,
  StorageOverview,
  SystemMetrics,
  Task,
  TrainingRun,
} from "@/types";

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
  return useAsync<Agent[]>(api.getAgents);
}

export function useActivities() {
  return useAsync<Activity[]>(api.getActivities, MEDIUM_REFRESH_MS);
}

export function useResearch() {
  return useAsync<ResearchItem[]>(api.getResearch);
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