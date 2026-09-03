"use client";

import Link from "next/link";

import { StatusDot } from "@/components/ui/StatusDot";
import { activityTone, titleCase } from "@/lib/status";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Activity } from "@/types";

interface ActivityTimelineProps {
  activities: Activity[];
}

function AssocChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-secondary transition-colors hover:text-accent"
    >
      {label}
    </Link>
  );
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const { t } = useI18n();

  if (activities.length === 0) {
    return <p className="px-5 py-4 text-sm text-text-muted">No activity yet.</p>;
  }

  return (
    <ol className="px-5 pb-4">
      {activities.map((activity, i) => {
        const tone = activityTone[activity.level];
        const isLast = i === activities.length - 1;
        return (
          <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[5px] top-4 h-full w-px bg-border-soft"
                aria-hidden="true"
              />
            )}
            <span className="relative mt-1.5">
              <StatusDot tone={tone} pulsing={activity.level === "success"} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[12px] tabular-nums text-text-muted">
                  {formatClock(activity.timestamp)}
                </span>
                <span className="text-[12px] font-medium uppercase tracking-wide text-text-secondary">
                  {t(`source.${activity.source}`, titleCase(activity.source))}
                </span>
              </div>
              <p className="mt-0.5 text-[14px] leading-snug text-text-primary">
                {activity.message}
              </p>
              {activity.detail && (
                <p className="mt-0.5 text-[12px] text-text-muted">
                  {activity.detail}
                </p>
              )}
              {(activity.researchProjectId ||
                activity.projectId ||
                activity.agentId ||
                activity.sessionId) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activity.researchProjectId && (
                    <AssocChip
                      href={`/research/projects/${activity.researchProjectId}`}
                      label={`research:${activity.researchProjectId}`}
                    />
                  )}
                  {activity.projectId && (
                    <AssocChip
                      href={`/projects/${activity.projectId}`}
                      label={`project:${activity.projectId}`}
                    />
                  )}
                  {activity.agentId && (
                    <AssocChip
                      href={`/agents/${activity.agentId}`}
                      label={`agent:${activity.agentId}`}
                    />
                  )}
                  {activity.sessionId && (
                    <AssocChip
                      href={`/sessions/${activity.sessionId}`}
                      label={`session:${activity.sessionId}`}
                    />
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}