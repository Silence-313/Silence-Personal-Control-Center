"use client";

import { formatRelativeAgo } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { workingTreeStatus } from "@/lib/status";
import type { Project } from "@/types";

export function ProjectList({ projects }: { projects: Project[] }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border-soft">
      {projects.map((p) => {
        const tree = workingTreeStatus(p.workingTree);
        return (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 px-5 py-2.5"
          >
            <div className="min-w-0">
              <span className="truncate text-[14px] font-medium text-text-primary">
                {p.name}
              </span>
              <span className="ml-2 font-mono text-[12px] text-text-muted">
                {p.branch}
              </span>
              {p.lastCommitTime && (
                <span className="ml-2 text-[12px] text-text-muted">
                  {formatRelativeAgo(p.lastCommitTime)}
                </span>
              )}
            </div>
            <StatusBadge tone={tree.tone} className="shrink-0">
              {t(`status.${tree.key}`, tree.label)}
            </StatusBadge>
          </li>
        );
      })}
    </ul>
  );
}