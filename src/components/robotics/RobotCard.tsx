"use client";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { robotStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Robot } from "@/types";

export function RobotCard({ robot }: { robot: Robot }) {
  const { t } = useI18n();
  const status = robotStatus(robot.status);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-text-primary">
            {robot.name}
          </div>
          <div className="mt-0.5 text-[12px] text-text-muted">{robot.model}</div>
        </div>
        <StatusBadge
          tone={status.tone}
          pulsing={robot.status === "running"}
          className="shrink-0"
        >
          {t(`status.${status.key}`, status.label)}
        </StatusBadge>
      </div>

      {robot.currentTask && (
        <div className="mt-3 truncate rounded-control bg-surface-2 px-3 py-2 text-[13px] text-text-secondary">
          <span className="text-text-muted">{t("label.task", "Task")}:</span>{" "}
          {robot.currentTask}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-soft pt-3 text-[12px]">
        {robot.simulation ? (
          <span className="text-text-muted">
            {t("label.sim", "Sim")}:{" "}
            <span className="text-text-secondary">{robot.simulation}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="text-text-muted">
          {t("label.lastRun", "Last run")} {robot.lastRun}
        </span>
      </div>
    </Card>
  );
}