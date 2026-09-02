"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { trainingStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { TrainingRun } from "@/types";

export function TrainingRunRow({ run }: { run: TrainingRun }) {
  const { t } = useI18n();
  const status = trainingStatus(run.status);

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[14px] font-medium text-text-primary">
            {run.name}
          </span>
          <span className="font-mono text-[12px] tabular-nums text-text-secondary">
            {run.progressPct}%
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <ProgressBar
            value={run.progressPct}
            tone={status.tone}
            className="flex-1"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-text-muted">
          <span>{run.environment}</span>
          {run.metric && (
            <>
              <span className="text-border-strong">•</span>
              <span className="font-mono">{run.metric}</span>
            </>
          )}
        </div>
      </div>
      <StatusBadge tone={status.tone} pulsing={run.status === "running"} className="shrink-0 self-start">
        {t(`status.${status.key}`, status.label)}
      </StatusBadge>
    </li>
  );
}