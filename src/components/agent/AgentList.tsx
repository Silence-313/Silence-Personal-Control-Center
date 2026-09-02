"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { agentStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Agent } from "@/types";

export function AgentList({ agents }: { agents: Agent[] }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border-soft">
      {agents.map((a) => {
        const status = agentStatus(a.status);
        return (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 px-5 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-text-primary">
                {a.name}
              </div>
              {a.currentTask && (
                <div className="truncate text-[12px] text-text-muted">
                  {a.currentTask}
                </div>
              )}
            </div>
            <StatusBadge
              tone={status.tone}
              pulsing={a.status === "running"}
              className="shrink-0"
            >
              {t(`status.${status.key}`, status.label)}
            </StatusBadge>
          </li>
        );
      })}
    </ul>
  );
}