"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { sessionStatus } from "@/lib/status";
import type { AgentSession } from "@/types";

interface AgentSessionListProps {
  sessions: AgentSession[];
  projectName?: (id: string) => string | undefined;
}

export function AgentSessionList({ sessions, projectName }: AgentSessionListProps) {
  const { t } = useI18n();

  if (sessions.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-[13px] text-text-muted">
        {t("agent.noSession", "No sessions yet.")}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border-soft">
      {sessions.map((s) => {
        const status = sessionStatus(s.status);
        return (
          <li key={s.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-mono text-[12px] text-text-primary">
                {s.id}
              </span>
              <StatusBadge
                tone={status.tone}
                pulsing={s.status === "running"}
                className="shrink-0"
              >
                {t(`status.${status.key}`, status.label)}
              </StatusBadge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-muted">
              <span>
                {t("label.project", "Project")}:{" "}
                {s.projectId ? (projectName?.(s.projectId) ?? s.projectId) : "—"}
              </span>
              <span>
                {t("label.started", "Started")}: {formatRelativeAgo(s.startedAt)}
              </span>
              {s.endedAt && (
                <span>
                  {t("label.ended", "Ended")}: {formatRelativeAgo(s.endedAt)}
                </span>
              )}
              <span>
                {t("label.lastActivity", "Last activity")}:{" "}
                {formatRelativeAgo(s.lastActivityAt)}
              </span>
            </div>
            {s.currentTask && (
              <div className="mt-1 truncate text-[12px] text-text-secondary">
                {s.currentTask}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}