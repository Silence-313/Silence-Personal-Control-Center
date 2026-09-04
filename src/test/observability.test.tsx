import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => {
  const MockLink = (props: Record<string, unknown>) => {
    const { href, children, ...rest } = props;
    return (
      <a href={href as string} {...rest}>
        {children as React.ReactNode}
      </a>
    );
  };
  return { default: MockLink };
});

vi.mock("@/lib/realtime", () => ({
  useRealtimeConnection: () => "open",
  useRealtimeMetrics: () => null,
  useRealtimeNodeStatus: () => null,
}));

vi.mock("@/hooks", () => ({
  useMetricsHistory: () => ({ data: [], loading: false, error: null }),
  useMetricsSummary: () => ({
    data: {
      nodeId: "macbook-pro",
      range: "24h",
      samples: 24,
      cpu: { average: 31, maximum: 78 },
      memory: { average: 57, maximum: 61 },
      disk: { average: 32 },
    },
    loading: false,
    error: null,
  }),
  useHealthSummary: () => ({
    data: {
      overallScore: 95,
      nodeHealth: { online: 1, offline: 0 },
      serviceHealth: { dockerDaemon: true, running: 3, stopped: 1 },
      recentErrors: [],
    },
    loading: false,
    error: null,
  }),
  useEventTimeline: () => ({ data: [], loading: false, error: null }),
  useAutomationRuns: () => ({ data: [], loading: false, error: null }),
}));

import ObservabilityPage from "@/app/observability/page";
import { I18nProvider } from "@/lib/i18n";

describe("Observability page", () => {
  it("renders the dashboard sections", () => {
    render(
      <I18nProvider>
        <ObservabilityPage />
      </I18nProvider>,
    );

    expect(screen.getByText("Observability")).toBeInTheDocument();
    expect(screen.getByText("Health Score")).toBeInTheDocument();
    expect(screen.getByText("Metrics Summary")).toBeInTheDocument();
    expect(screen.getByText("Event Timeline")).toBeInTheDocument();
    expect(screen.getByText("Automation Runs")).toBeInTheDocument();
    // three metric charts (each metric label also appears in the summary card)
    expect(screen.getAllByText("CPU").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Memory").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Disk").length).toBeGreaterThanOrEqual(2);
  });
});