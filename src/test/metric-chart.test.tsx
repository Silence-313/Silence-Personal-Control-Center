import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricChart } from "@/components/observability/MetricChart";

describe("MetricChart", () => {
  it("renders title, latest value, avg and max summary", () => {
    render(<MetricChart title="CPU" values={[10, 20, 30]} unit="%" />);
    expect(screen.getByText("CPU")).toBeInTheDocument();
    // latest value (30.0) with the % unit in an adjacent span
    expect(screen.getByText("30.0")).toBeInTheDocument();
    expect(screen.getByText(/avg/)).toBeInTheDocument();
    expect(screen.getByText(/max/)).toBeInTheDocument();
    // 20.0 average
    expect(screen.getByText("20.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });

  it("shows empty state when there is no history", () => {
    render(<MetricChart title="Memory" values={[]} />);
    expect(screen.getByText("No history yet.")).toBeInTheDocument();
  });
});