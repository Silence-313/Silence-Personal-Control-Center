import type { Node } from "@/types";

/**
 * Mock node registry.
 *
 * `macbook-pro-m3-pro` is the single live node today (Phase 0 audit).
 * The other two entries are *planned* future nodes, kept `offline` so the
 * multi-node UI (and Phase 3's Node Registry) is exercised without implying
 * they physically exist.
 */
export const nodes: Node[] = [
  {
    id: "macbook-pro-m3-pro",
    name: "MacBook Pro",
    model: "MacBook Pro (Mac15,7)",
    platform: "macos",
    architecture: "arm64",
    status: "online",
    capabilities: [
      "system_metrics",
      "docker",
      "git",
      "sleep",
      "wake",
      "terminal",
      "storage",
    ],
    hardware: {
      chip: "Apple M3 Pro",
      cpuCores: 12,
      performanceCores: 6,
      efficiencyCores: 6,
      memoryGb: 36,
      gpu: "18-core integrated",
    },
    osVersion: "macOS 15.7.3",
    ip: "192.168.1.64",
    uptime: "6d 14h",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "mac-studio-m4-max",
    name: "Mac Studio",
    model: "Mac Studio (planned)",
    platform: "macos",
    architecture: "arm64",
    status: "offline",
    capabilities: ["system_metrics", "docker", "gpu", "terminal"],
    hardware: {
      chip: "Apple M4 Max",
      cpuCores: 16,
      performanceCores: 12,
      efficiencyCores: 4,
      memoryGb: 128,
      gpu: "40-core integrated",
    },
    osVersion: "—",
    ip: "—",
    uptime: "—",
    lastSeen: "—",
  },
  {
    id: "gpu-server-linux",
    name: "GPU Server",
    model: "Linux GPU Server (planned)",
    platform: "linux",
    architecture: "x86_64",
    status: "offline",
    capabilities: ["system_metrics", "docker", "gpu", "training", "simulation"],
    hardware: {
      chip: "NVIDIA RTX",
      cpuCores: 32,
      performanceCores: 32,
      efficiencyCores: 0,
      memoryGb: 256,
      gpu: "NVIDIA RTX × 2",
    },
    osVersion: "—",
    ip: "—",
    uptime: "—",
    lastSeen: "—",
  },
];

export const primaryNode = nodes[0];