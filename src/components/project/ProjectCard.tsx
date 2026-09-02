"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { projectHealth, workingTreeStatus } from "@/lib/status";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { t } = useI18n();
  const tree = workingTreeStatus(project.workingTree);
  const health = projectHealth(project.health);
  const modified = project.modified ?? 0;

  return (
    <Link href={`/projects/${project.id}`} className="block h-full">
      <Card className="flex h-full flex-col p-4 transition-colors hover:border-border-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-text-primary">
              {project.name}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-text-muted">
              {project.nodeId} · {project.repositoryPath}
            </div>
          </div>
          <StatusBadge tone={tree.tone} className="shrink-0">
            {t(`status.${tree.key}`, tree.label)}
          </StatusBadge>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-text-secondary">
          <GitBranch className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          <span className="font-mono">{project.branch}</span>
          {health.key !== "healthy" && (
            <span className="text-text-muted">· {t(`status.${health.key}`, health.label)}</span>
          )}
          {modified > 0 && (
            <span className="text-text-muted">
              · {t("project.modifiedFiles", "{n} files modified", { n: modified })}
            </span>
          )}
        </div>

        <div className="mt-1.5 truncate text-[12px] text-text-muted">
          {project.lastCommitHash && (
            <span className="font-mono">{project.lastCommitHash}</span>
          )}
          {project.lastCommitSubject && project.lastCommitSubject !== "—" && (
            <span> · {project.lastCommitSubject}</span>
          )}
          {project.lastCommitTime && (
            <span> · {formatRelativeAgo(project.lastCommitTime)}</span>
          )}
        </div>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-text-muted">
            {project.description}
          </p>
        )}

        {project.tech && project.tech.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tech.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}