"use client";

import { Card } from "@/components/ui/Card";
import { TONE_TEXT, type StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

interface MetricChartProps {
  title: string;
  values: number[];
  unit?: string;
  tone?: StatusTone;
  height?: number;
}

/**
 * Dependency-free SVG line chart for a metric time series (oldest → newest).
 * Shows the latest value plus average/maximum summary rows.
 */
export function MetricChart({
  title,
  values,
  unit = "%",
  tone = "info",
  height = 110,
}: MetricChartProps) {
  const latest = values.length ? values[values.length - 1] : 0;
  const max = values.length ? Math.max(...values) : 0;
  const avg = values.length
    ? values.reduce((acc, v) => acc + v, 0) / values.length
    : 0;

  const min = values.length ? Math.min(...values) : 0;
  const range = max - min || 1;
  const width = 100;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((v - min) / range) * (height - 6) - 3).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums text-text-primary">
          {latest.toFixed(1)}
          <span className="ml-0.5 text-sm text-text-secondary">{unit}</span>
        </span>
      </div>

      {values.length >= 2 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className={cn("mt-3 h-24 w-full flex-1", TONE_TEXT[tone])}
          aria-hidden="true"
        >
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="mt-3 flex h-24 flex-1 items-center text-sm text-text-muted">
          No history yet.
        </p>
      )}

      <div className="mt-2 flex gap-4 text-[12px] text-text-secondary">
        <span>
          avg{" "}
          <b className="font-mono font-medium text-text-primary">
            {avg.toFixed(1)}
            {unit}
          </b>
        </span>
        <span>
          max{" "}
          <b className="font-mono font-medium text-text-primary">
            {max.toFixed(1)}
            {unit}
          </b>
        </span>
      </div>
    </Card>
  );
}