"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { agentStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { t } = useI18n();
  const status = agentStatus(agent.status);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-text-primary">
            {agent.name}
          </div>
          <div className="mt-0.5 text-[12px] text-text-muted">{agent.role}</div>
        </div>
        <StatusBadge
          tone={status.tone}
          pulsing={agent.status === "running"}
          className="shrink-0"
        >
          {t(`status.${status.key}`, status.label)}
        </StatusBadge>
      </div>

      {agent.currentTask && (
        <div className="mt-3 rounded-control border border-border-soft bg-surface-2 p-3">
          <div className="truncate text-[13px] text-text-primary">
            {agent.currentTask}
          </div>
          {typeof agent.progressPct === "number" && (
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={agent.progressPct} tone={status.tone} className="flex-1" />
              <span className="font-mono text-[12px] tabular-nums text-text-secondary">
                {agent.progressPct}%
              </span>
            </div>
          )}
        </div>
      )}

      <dl className="mt-3 space-y-1.5 text-[12px]">
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">{t("label.lastSession", "Last session")}</dt>
          <dd className="text-text-secondary">{agent.lastSession}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">{t("label.lastActivity", "Last activity")}</dt>
          <dd className="truncate text-right text-text-secondary">
            {agent.lastActivity}
          </dd>
        </div>
      </dl>
    </Card>
  );
}