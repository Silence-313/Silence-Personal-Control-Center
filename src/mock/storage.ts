import type { StorageOverview } from "@/types";

/**
 * Mock data for the future 2TB "Personal AI Data Center" drive.
 * Values are illustrative and intentionally sum to the reported usage.
 */
export const storage: StorageOverview = {
  driveName: "AI Data",
  mountPoint: "/Volumes/AIData",
  totalGb: 2000,
  usedGb: 1240,
  freeGb: 760,
  categories: [
    { key: "datasets", label: "Datasets", sizeGb: 620 },
    { key: "models", label: "Models", sizeGb: 310 },
    { key: "videos", label: "Videos", sizeGb: 180 },
    { key: "experiments", label: "Experiments", sizeGb: 90 },
    { key: "papers", label: "Papers", sizeGb: 20 },
    { key: "backups", label: "Backups", sizeGb: 20 },
  ],
};