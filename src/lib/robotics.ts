import type { ExperimentStatus } from "@/types";
import type { StatusTone } from "@/lib/status";

/** Tone mapping for robotics experiments (mirrors the training-run rules). */
export function statusTone(status: ExperimentStatus): StatusTone {
  switch (status) {
    case "completed":
      return "success";
    case "running":
      return "info";
    case "failed":
      return "error";
    case "queued":
      return "neutral";
  }
}