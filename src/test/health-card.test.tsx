import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthScore } from "@/components/observability/HealthScore";
import type { HealthSummary } from "@/types";

const healthy: HealthSummary = {
  overallScore: 95,
  nodeHealth: { online: 1, offline: 0 },
  serviceHealth: { dockerDaemon: true, running: 3, stopped: 1 },
  recentErrors: [],
};

const degraded: HealthSummary = {
  overallScore: 45,
  nodeHealth: { online: 0, offline: 2 },
  serviceHealth: { dockerDaemon: false, running: 0, stopped: 1 },
  recentErrors: [
    {
      id: "e1",
      type: "system",
      action: "failed",
      message: "backup failed",
      timestamp: "2026-09-04T10:00:00Z",
    },
  ],
};

describe("HealthScore", () => {
  it("renders the overall score and node breakdown", () => {
    render(<HealthScore summary={healthy} />);
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText(/1 online/)).toBeInTheDocument();
  });

  it("renders degraded state with error count", () => {
    render(<HealthScore summary={degraded} />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText(/2 offline/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // recent errors count
  });

  it("renders a loading skeleton when there is no summary yet", () => {
    render(<HealthScore summary={null} loading />);
    // No score is shown; the skeleton block renders without crashing.
    expect(screen.queryByText("95")).not.toBeInTheDocument();
  });
});