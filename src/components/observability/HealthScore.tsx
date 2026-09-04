"use client";

import { Card } from "@/components/ui/Card";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { HealthSummary } from "@/types";

function toneForScore(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-success", bar: "bg-success" };
  if (score >= 50) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-error", bar: "bg-error" };
}

interface HealthScoreProps {
  summary: HealthSummary | null;
  loading?: boolean;
}

/**
 * System health score card: overall score bar + node/service/error breakdown.
 */
export function HealthScore({ summary, loading }: HealthScoreProps) {
  if (loading || !summary) {
    return (
      <Card className="p-4">
        <SkeletonBlock />
      </Card>
    );
  }

  const { overallScore, nodeHealth, serviceHealth, recentErrors } = summary;
  const tone = toneForScore(overallScore);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          Health Score
        </span>
        <span
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums",
            tone.text,
          )}
        >
          {overallScore}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full transition-all", tone.bar)}
          style={{ width: `${Math.max(0, Math.min(100, overallScore))}%` }}
        />
      </div>

      <dl className="mt-4 space-y-1.5 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-text-muted">Nodes</dt>
          <dd className="font-medium text-text-primary">
            <span className="text-success">{nodeHealth.online} online</span>
            {" · "}
            <span className="text-error">{nodeHealth.offline} offline</span>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">Docker</dt>
          <dd className="font-medium text-text-primary">
            {serviceHealth.dockerDaemon == null
              ? "—"
              : `${serviceHealth.running} running · ${serviceHealth.stopped} stopped`}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">Recent errors</dt>
          <dd className="font-medium text-text-primary">{recentErrors.length}</dd>
        </div>
      </dl>
    </Card>
  );
}