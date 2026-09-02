"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { titleCase, type StatusTone } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Task, TaskStatus } from "@/types";

const TASK_TONE: Record<TaskStatus, StatusTone> = {
  running: "info",
  queued: "neutral",
  paused: "warning",
};

export function TaskList({ tasks }: { tasks: Task[] }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border-soft">
      {tasks.map((task) => {
        const tone = TASK_TONE[task.status];
        return (
          <li key={task.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[14px] font-medium text-text-primary">
                {task.name}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-text-secondary">
                {task.progressPct}%
              </span>
            </div>
            {task.detail && (
              <div className="mt-0.5 text-[12px] text-text-muted">
                {task.detail}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar
                value={task.progressPct}
                tone={tone}
                className="flex-1"
              />
              <StatusBadge tone={tone} pulsing={task.status === "running"}>
                {t(`status.${task.status}`, titleCase(task.status))}
              </StatusBadge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}