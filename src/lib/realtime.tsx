"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import * as backend from "@/lib/backend";
import type {
  HealthSummary,
  MetricSample,
  NodeStatus,
  SystemMetrics,
} from "@/types";

export type ConnectionState = "connecting" | "open" | "reconnecting" | "fallback";

export interface NodeStatusEvent {
  id: string;
  name: string;
  status: NodeStatus;
  lastSeen: string;
}

export interface AutomationEvent {
  ruleId: string;
  status: string;
  trigger?: string;
  error?: string | null;
  triggeredAt: string;
}

interface RealtimeContextValue {
  connection: ConnectionState;
  metrics: SystemMetrics | null;
  nodeStatus: NodeStatusEvent | null;
  /** Real-time metric snapshot history (from `metrics_snapshot` events). */
  metricSamples: MetricSample[];
  healthSummary: HealthSummary | null;
  automationEvents: AutomationEvent[];
  /** Real-time source is currently unavailable (data may be stale). */
  stale: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const NODE_ID = process.env.NEXT_PUBLIC_NODE_ID ?? "macbook-pro";
const POLL_MS = 8000; // polling fallback cadence for metrics
const MAX_BACKOFF_MS = 30000;

function backoffDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
  const jitter = Math.random() * 500;
  return base + jitter;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [nodeStatus, setNodeStatus] = useState<NodeStatusEvent | null>(null);
  const [metricSamples, setMetricSamples] = useState<MetricSample[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [automationEvents, setAutomationEvents] = useState<AutomationEvent[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const nodeIdRef = useRef<string>(NODE_ID);
  const aliveRef = useRef(true);

  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopReconnect = useCallback(() => {
    if (reconnectRef.current !== null) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const closeEs = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const refreshData = useCallback(() => {
    // Reuse the existing wake signal so every REST hook refetches in-place.
    try {
      window.dispatchEvent(new CustomEvent("silence:wake"));
    } catch {
      /* ignore */
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const [m, nodes] = await Promise.all([
        backend.fetchMetrics(),
        backend.fetchNodes(),
      ]);
      if (!aliveRef.current) return;
      setMetrics(m);
      const node = nodes[0];
      if (node) {
        nodeIdRef.current = node.id;
        setNodeStatus({
          id: node.id,
          name: node.name,
          status: node.status,
          lastSeen: node.lastSeen,
        });
      }
    } catch {
      /* keep last known; stale is surfaced via connection !== "open" */
    }
  }, []);

  const startPoll = useCallback(() => {
    stopPoll();
    void poll();
    pollRef.current = window.setInterval(() => {
      void poll();
    }, POLL_MS);
  }, [stopPoll, poll]);

  const connect = useCallback(async () => {
    if (!aliveRef.current) return;
    stopReconnect();
    stopPoll();

    let ticket: string | null = null;
    try {
      ticket = await backend.fetchSseTicket();
    } catch {
      if (aliveRef.current) {
        setConnection("fallback");
        startPoll();
      }
      return;
    }
    if (!aliveRef.current) return;

    closeEs();
    const es = new EventSource(
      `${backend.API_BASE}/api/v1/events?ticket=${encodeURIComponent(ticket)}`,
    );
    esRef.current = es;
    setConnection("connecting");

    es.onopen = () => {
      if (!aliveRef.current) return;
      attemptRef.current = 0;
      setConnection("open");
      stopPoll();
      refreshData();
    };

    es.addEventListener("metrics", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data) as backend.BMetrics;
        setMetrics(backend.mapMetrics(raw, nodeIdRef.current));
      } catch {
        /* malformed event */
      }
    });

    es.addEventListener("node_status", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data) as {
          id: string;
          name: string;
          status: NodeStatus;
          last_seen: string;
        };
        nodeIdRef.current = raw.id;
        setNodeStatus({
          id: raw.id,
          name: raw.name,
          status: raw.status,
          lastSeen: raw.last_seen,
        });
      } catch {
        /* malformed event */
      }
    });

    es.addEventListener("metrics_snapshot", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data) as {
          node_id: string;
          timestamp: string;
          cpu_percent: number;
          memory_percent: number;
          disk_percent: number;
          network_rx: number;
          network_tx: number;
          metadata?: Record<string, unknown>;
        };
        setMetricSamples((prev) => {
          const sample: MetricSample = {
            id: `live-${raw.timestamp}`,
            nodeId: raw.node_id,
            timestamp: raw.timestamp,
            cpuPercent: raw.cpu_percent,
            memoryPercent: raw.memory_percent,
            diskPercent: raw.disk_percent,
            networkRx: raw.network_rx,
            networkTx: raw.network_tx,
            metadata: raw.metadata ?? {},
          };
          const next = [...prev, sample];
          return next.length > 120 ? next.slice(next.length - 120) : next;
        });
      } catch {
        /* malformed event */
      }
    });

    es.addEventListener("health_update", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data);
        setHealthSummary(backend.mapHealthSummary(raw));
      } catch {
        /* malformed event */
      }
    });

    es.addEventListener("automation_event", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data) as {
          rule_id: string;
          status: string;
          trigger?: string;
          error?: string | null;
          triggered_at: string;
        };
        const event: AutomationEvent = {
          ruleId: raw.rule_id,
          status: raw.status,
          trigger: raw.trigger,
          error: raw.error,
          triggeredAt: raw.triggered_at,
        };
        setAutomationEvents((prev) => [...prev, event].slice(-50));
      } catch {
        /* malformed event */
      }
    });

    es.onerror = () => {
      closeEs();
      if (!aliveRef.current) return;
      setConnection("reconnecting");
      startPoll();
      const delay = backoffDelay(attemptRef.current);
      attemptRef.current += 1;
      stopReconnect();
      reconnectRef.current = window.setTimeout(() => {
        void connect();
      }, delay);
    };
  }, [closeEs, stopPoll, stopReconnect, startPoll, refreshData]);

  useEffect(() => {
    aliveRef.current = true;
    void connect();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Always reconnect fresh: iOS may have killed the socket in background.
        void connect();
      } else {
        // Hidden: don't hold a connection or storm while timers/sockets pause.
        closeEs();
        stopPoll();
        stopReconnect();
      }
    };
    const onFocus = () => {
      // Only reconnect if the socket is gone (window already visible).
      const open = esRef.current?.readyState === EventSource.OPEN;
      if (document.visibilityState === "visible" && !open) void connect();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      aliveRef.current = false;
      closeEs();
      stopPoll();
      stopReconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [connect, closeEs, stopPoll, stopReconnect]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connection,
      metrics,
      nodeStatus,
      metricSamples,
      healthSummary,
      automationEvents,
      stale: connection !== "open",
    }),
    [connection, metrics, nodeStatus, metricSamples, healthSummary, automationEvents],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}

export function useRealtimeMetrics(): SystemMetrics | null {
  return useRealtime().metrics;
}

export function useRealtimeNodeStatus(): NodeStatusEvent | null {
  return useRealtime().nodeStatus;
}

export function useRealtimeConnection(): ConnectionState {
  return useRealtime().connection;
}

export function useRealtimeMetricSamples(): MetricSample[] {
  return useRealtime().metricSamples;
}

export function useRealtimeHealthSummary(): HealthSummary | null {
  return useRealtime().healthSummary;
}

export function useRealtimeAutomationEvents(): AutomationEvent[] {
  return useRealtime().automationEvents;
}