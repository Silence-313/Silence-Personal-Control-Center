import { describe, expect, it } from "vitest";

import {
  mapCommand,
  mapMetrics,
  mapNode,
  mapPower,
} from "@/lib/backend";

const GB = 1024 ** 3;

describe("mapMetrics (SSE /metrics payload → SystemMetrics)", () => {
  const raw = {
    cpu: {
      usage_percent: 42.5,
      cores: 8,
      per_core: [10, 20, 30],
      load_average: [1.2, 0.9, 0.7],
    },
    memory: { total_bytes: 16 * GB, used_bytes: 8 * GB, usage_percent: 50 },
    disk: { total_bytes: 512 * GB, used_bytes: 256 * GB, usage_percent: 50 },
    network: { down_mbps: 12.3, up_mbps: 4.5 },
    uptime_seconds: 3600,
    collected_at: "2025-01-01T00:00:00Z",
  };

  it("maps CPU fields", () => {
    const m = mapMetrics(raw, "macbook-pro");
    expect(m.cpu.usagePct).toBe(42.5);
    expect(m.cpu.loadAvg).toBe(1.2);
    expect(m.cpu.cores).toBe(8);
    expect(m.cpu.history).toEqual([10, 20, 30]);
  });

  it("maps bytes → GB and preserves percentages", () => {
    const m = mapMetrics(raw, "macbook-pro");
    expect(m.memory.usedGb).toBe(8);
    expect(m.memory.totalGb).toBe(16);
    expect(m.memory.usagePct).toBe(50);
    expect(m.storage.usedGb).toBe(256);
    expect(m.storage.totalGb).toBe(512);
    expect(m.storage.usagePct).toBe(50);
  });

  it("maps network, node id and timestamp", () => {
    const m = mapMetrics(raw, "macbook-pro");
    expect(m.network.downMbps).toBe(12.3);
    expect(m.network.upMbps).toBe(4.5);
    expect(m.nodeId).toBe("macbook-pro");
    expect(m.updatedAt).toBe("2025-01-01T00:00:00Z");
  });

  it("tolerates empty per_core/load_average", () => {
    const m = mapMetrics(
      { ...raw, cpu: { ...raw.cpu, per_core: [], load_average: [] } },
      "n1",
    );
    expect(m.cpu.loadAvg).toBe(0);
    expect(m.cpu.history).toEqual([]);
  });
});

describe("mapNode (snake_case node → Node)", () => {
  const raw = {
    id: "macbook-pro",
    name: "MacBook Pro",
    platform: "darwin",
    architecture: "arm64",
    os_version: "15.7.3",
    status: "online",
    capabilities: ["system_metrics", "docker_read", "power_sleep"],
    last_seen: "2025-01-01T00:00:00Z",
    model: "MacBook Pro 16",
    ip: "10.101.184.21",
    uptime_seconds: 120,
    hardware: {
      chip: "Apple M3 Pro",
      cpu_cores: 12,
      performance_cores: 8,
      efficiency_cores: 4,
      memory_gb: 36,
      gpu: "18-core",
    },
  };

  it("maps identity and hardware", () => {
    const n = mapNode(raw);
    expect(n.id).toBe("macbook-pro");
    expect(n.name).toBe("MacBook Pro");
    expect(n.platform).toBe("darwin");
    expect(n.architecture).toBe("arm64");
    expect(n.osVersion).toBe("15.7.3");
    expect(n.hardware.chip).toBe("Apple M3 Pro");
    expect(n.hardware.cpuCores).toBe(12);
    expect(n.hardware.performanceCores).toBe(8);
    expect(n.hardware.efficiencyCores).toBe(4);
    expect(n.hardware.memoryGb).toBe(36);
    expect(n.hardware.gpu).toBe("18-core");
  });

  it("maps capabilities through", () => {
    const n = mapNode(raw);
    expect(n.capabilities).toContain("system_metrics");
    expect(n.capabilities).toContain("docker_read");
    expect(n.capabilities).toContain("power_sleep");
  });
});

describe("mapPower", () => {
  it("maps snake_case → camelCase", () => {
    expect(
      mapPower({ state: "awake", battery: 80, charging: true, sleep_supported: true }),
    ).toEqual({ state: "awake", battery: 80, charging: true, sleepSupported: true });
  });
});

describe("mapCommand (sleep/wake target = power)", () => {
  it("maps sleep → power", () => {
    const c = mapCommand({
      id: "c1",
      node_id: "n1",
      command: "sleep",
      status: "running",
      requested_at: "t",
      result: null,
    });
    expect(c.target).toBe("power");
    expect(c.action).toBe("sleep");
    expect(c.status).toBe("running");
  });

  it("maps wake → power and other commands → service", () => {
    expect(
      mapCommand({
        id: "c2",
        node_id: "n1",
        command: "wake",
        status: "success",
        requested_at: "t",
        result: "ok",
      }).target,
    ).toBe("power");
    expect(
      mapCommand({
        id: "c3",
        node_id: "n1",
        command: "restart",
        status: "success",
        requested_at: "t",
        result: "ok",
      }).target,
    ).toBe("service");
  });
});