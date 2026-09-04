"use client";

import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatClock, formatRelativeAgo } from "@/lib/format";
import type { StatusTone } from "@/lib/status";
import type { AutomationRun } from "@/types";

function toneForStatus(status: AutomationRun["status"]): StatusTone {
  if (status === "success") return "success";
  if (status === "failed") return "error";
  return "neutral";
}

interface AutomationRunsProps {
  runs: AutomationRun[] | null;
  loading?: boolean;
}

/** Recent automation rule executions (success / failed / skipped). */
export function AutomationRuns({ runs, loading }: AutomationRunsProps) {
  const items = runs ?? [];

  return (
    <Card>
      <SectionHeading title="Automation Runs" />
      {items.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-text-muted">
          {loading ? "Loading…" : "No runs recorded."}
        </p>
      ) : (
        <ul className="px-5 pb-4">
          {items.slice(0, 12).map((run) => (
            <li
              key={run.id}
              className="flex items-center justify-between gap-3 border-b border-border-soft py-2 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={toneForStatus(run.status)} dot>
                    {run.status}
                  </StatusBadge>
                  <span className="truncate font-mono text-[12px] text-text-secondary">
                    {run.ruleId}
                  </span>
                </div>
                {run.error && (
                  <p className="mt-0.5 truncate text-[12px] text-text-muted">
                    {run.error}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[12px] tabular-nums text-text-muted">
                  {formatClock(run.triggeredAt)}
                </div>
                <div className="text-[11px] text-text-muted">
                  {formatRelativeAgo(run.triggeredAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}