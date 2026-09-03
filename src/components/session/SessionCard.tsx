"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { sessionStatus } from "@/lib/status";
import type { AgentSession } from "@/types";

export function SessionCard({ session }: { session: AgentSession }) {
  const { t } = useI18n();
  const visual = sessionStatus(session.status);
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block h-full transition-colors hover:border-border-strong"
    >
      <Card className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px] font-semibold text-text-primary">
              {session.id}
            </div>
            <div className="mt-0.5 text-[13px] text-text-secondary">
              {t("label.agent", "Agent")}: <span className="font-mono">{session.agentId}</span>
            </div>
          </div>
          <StatusBadge tone={visual.tone} className="shrink-0">
            {t(`status.${visual.key}`, visual.label)}
          </StatusBadge>
        </div>

        {session.currentTask && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-text-secondary">
            {session.currentTask}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {session.projectId && (
            <span className="rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-muted">
              project:{session.projectId}
            </span>
          )}
          {session.researchProjectId && (
            <span className="rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-muted">
              research:{session.researchProjectId}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}