import type { Activity } from "@/types";

const now = Date.now();
const iso = (minutesAgo: number) =>
  new Date(now - minutesAgo * 60_000).toISOString();

export const activities: Activity[] = [
  {
    id: "evt-001",
    timestamp: iso(8),
    source: "docker",
    level: "success",
    message: "SearXNG started",
    detail: "Container searxng → 8080",
    nodeId: "macbook-pro-m3-pro",
  },
  {
    id: "evt-002",
    timestamp: iso(13),
    source: "robotics",
    level: "success",
    message: "G1 experiment completed",
    detail: "Motion tracking — reward 0.81",
    nodeId: "gpu-server-linux",
  },
  {
    id: "evt-003",
    timestamp: iso(34),
    source: "git",
    level: "info",
    message: "Second Brain updated",
    detail: "main @ a1b2c3d",
    nodeId: "macbook-pro-m3-pro",
  },
  {
    id: "evt-004",
    timestamp: iso(58),
    source: "research",
    level: "info",
    message: "New session started",
    detail: "Humanoid locomotion review",
    nodeId: "macbook-pro-m3-pro",
  },
  {
    id: "evt-005",
    timestamp: iso(83),
    source: "agent",
    level: "info",
    message: "Coding Agent went idle",
    detail: "G1 reward configuration reviewed",
    nodeId: "macbook-pro-m3-pro",
  },
  {
    id: "evt-006",
    timestamp: iso(150),
    source: "system",
    level: "success",
    message: "MacBook Pro online",
    detail: "Awake · 6d 14h uptime",
    nodeId: "macbook-pro-m3-pro",
  },
  {
    id: "evt-007",
    timestamp: iso(240),
    source: "robotics",
    level: "warning",
    message: "Training run paused",
    detail: "N2 — checkpoint saved",
    nodeId: "gpu-server-linux",
  },
  {
    id: "evt-008",
    timestamp: iso(60 * 20),
    source: "git",
    level: "info",
    message: "GMR pushed to dev",
    detail: "dev @ 91cc7fa (1 ahead)",
    nodeId: "macbook-pro-m3-pro",
  },
];

/** Grouped, newest-first, for the Activity page timeline. */
export type ActivityDay = { label: string; items: Activity[] };