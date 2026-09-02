import type { Task } from "@/types";

/**
 * Dashboard "Current Tasks" view. In a real backend this is an aggregate of
 * active agent work + training runs, not a separately stored entity.
 */
export const tasks: Task[] = [
  {
    id: "task-01",
    name: "G1 Motion Training",
    kind: "training",
    status: "running",
    progressPct: 78,
    detail: "MuJoCo · reward 0.81",
  },
  {
    id: "task-02",
    name: "Research Paper Review",
    kind: "research",
    status: "running",
    progressPct: 42,
    detail: "3 papers · humanoid locomotion",
  },
  {
    id: "task-03",
    name: "N2 Gait Ablation",
    kind: "training",
    status: "queued",
    progressPct: 0,
    detail: "5-seed sweep",
  },
  {
    id: "task-04",
    name: "Motion Dataset Index",
    kind: "data",
    status: "paused",
    progressPct: 61,
    detail: "620 GB · motion clips",
  },
];