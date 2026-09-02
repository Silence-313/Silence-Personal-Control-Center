import type { Robot, RoboticsExperiment, TrainingRun } from "@/types";

export const robots: Robot[] = [
  {
    id: "g1",
    name: "G1",
    model: "Unitree G1",
    status: "ready",
    currentTask: "Motion tracking",
    simulation: "MuJoCo",
    lastRun: "13:15 today",
  },
  {
    id: "n2",
    name: "N2",
    model: "Biped (custom)",
    status: "idle",
    simulation: "MuJoCo",
    lastRun: "Yesterday",
  },
  {
    id: "mujoco",
    name: "MuJoCo",
    model: "Simulation",
    status: "running",
    currentTask: "G1 motion playback",
    lastRun: "now",
  },
  {
    id: "training",
    name: "Training",
    model: "RL cluster",
    status: "idle",
    lastRun: "Yesterday",
  },
];

export const trainingRuns: TrainingRun[] = [
  {
    id: "tr-01",
    name: "G1 Motion Tracking",
    robotId: "g1",
    environment: "MuJoCo",
    status: "running",
    progressPct: 78,
    metric: "reward 0.81",
    updatedAt: "13:15",
  },
  {
    id: "tr-02",
    name: "N2 Gait Stability",
    robotId: "n2",
    environment: "MuJoCo",
    status: "completed",
    progressPct: 100,
    metric: "success 0.74",
    updatedAt: "Yesterday",
  },
  {
    id: "tr-03",
    name: "GMR Retargeting Eval",
    robotId: "g1",
    environment: "Kinematics",
    status: "failed",
    progressPct: 47,
    metric: "n/a",
    updatedAt: "2d ago",
  },
];

export const experiments: RoboticsExperiment[] = [
  {
    id: "rb-exp-01",
    name: "G1 Motion Tracking",
    projectId: "g1-mechdance",
    status: "running",
    summary: "Policy following reference motion with reward 0.81 (78%).",
    updatedAt: "13:15 today",
  },
  {
    id: "rb-exp-02",
    name: "N2 Gait Ablation",
    projectId: "n2",
    status: "completed",
    summary: "5-seed sweep — best success rate 0.74.",
    updatedAt: "Yesterday",
  },
  {
    id: "rb-exp-03",
    name: "GMR Cross-embodiment Transfer",
    projectId: "gmr",
    status: "queued",
    summary: "Retarget human clips onto N2 morphology.",
    updatedAt: "Queued 2h ago",
  },
];