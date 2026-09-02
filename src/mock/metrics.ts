import type { SystemMetrics } from "@/types";

const series = (seed: number, n = 24, spread = 12): number[] => {
  const out: number[] = [];
  let v = seed;
  for (let i = 0; i < n; i++) {
    v = Math.max(
      5,
      Math.min(95, v + (Math.random() - 0.5) * spread),
    );
    out.push(Math.round(v));
  }
  return out;
};

export const metrics: SystemMetrics = {
  nodeId: "macbook-pro-m3-pro",
  cpu: {
    usagePct: 24,
    loadAvg: 2.31,
    cores: 12,
    history: series(24),
  },
  memory: {
    usedGb: 17.2,
    totalGb: 36,
    usagePct: 48,
    history: series(48, 24, 8),
  },
  storage: {
    usedGb: 148,
    totalGb: 460,
    usagePct: 32,
  },
  network: {
    downMbps: 24.6,
    upMbps: 4.1,
  },
  temperatureC: 44,
  updatedAt: new Date().toISOString(),
};