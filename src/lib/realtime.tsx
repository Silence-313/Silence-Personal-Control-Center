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
import type { NodeStatus, SystemMetrics } from "@/types";

export type ConnectionState = "connecting" | "open" | "reconnecting" | "fallback";

export interface NodeStatusEvent {
  id: string;
  name: string;
  status: NodeStatus;
  lastSeen: string;
}

interface RealtimeContextValue {
  connection: ConnectionState;
  metrics: SystemMetrics | null;
  nodeStatus: NodeStatusEvent | null;
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
      stale: connection !== "open",
    }),
    [connection, metrics, nodeStatus],
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