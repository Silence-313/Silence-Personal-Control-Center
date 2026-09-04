import type {
  AutomationRun,
  HealthSummary,
  MetricSample,
  MetricsSummary,
} from "@/types";

const now = Date.now();

function iso(minutesAgo: number): string {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

/** 24 ascending samples spaced 5 minutes apart (oldest → newest). */
export const metricsHistory: MetricSample[] = Array.from({ length: 24 }, (_, i) => {
  const t = 24 - i; // minutes ago (24 → 0)
  return {
    id: `ms-${i}`,
    nodeId: "macbook-pro",
    timestamp: iso(t * 5),
    cpuPercent: Math.round(18 + ((i * 7) % 23) + Math.sin(i) * 4),
    memoryPercent: Math.round(54 + ((i * 3) % 8)),
    diskPercent: 32,
    networkRx: Number((2 + ((i % 6) * 1.7)).toFixed(1)),
    networkTx: Number((0.4 + ((i % 4) * 0.6)).toFixed(1)),
    metadata: { cores: 12 },
  };
});

export const metricsSummary: MetricsSummary = {
  nodeId: "macbook-pro",
  range: "24h",
  samples: metricsHistory.length,
  cpu: { average: 31.2, maximum: 78.1 },
  memory: { average: 57.4, maximum: 61.0 },
  disk: { average: 32.0 },
};

export const healthSummary: HealthSummary = {
  overallScore: 95,
  nodeHealth: { online: 1, offline: 0 },
  serviceHealth: { dockerDaemon: true, running: 3, stopped: 1 },
  recentErrors: [],
};

export const automationRuns: AutomationRun[] = [
  {
    id: "run-3",
    ruleId: "failed-activity-alert",
    trigger: "activity.created",
    status: "success",
    result: { actions: [{ type: "notify", ok: true }, { type: "create_activity", ok: true }] },
    error: null,
    triggeredAt: iso(6),
  },
  {
    id: "run-2",
    ruleId: "node-offline-alert",
    trigger: "node.offline",
    status: "skipped",
    result: {},
    error: null,
    triggeredAt: iso(18),
  },
  {
    id: "run-1",
    ruleId: "failed-activity-alert",
    trigger: "activity.created",
    status: "failed",
    result: { actions: [{ type: "notify", ok: false }] },
    error: "notify: not ok",
    triggeredAt: iso(42),
  },
];