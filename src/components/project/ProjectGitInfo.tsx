"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { workingTreeStatus } from "@/lib/status";
import type { Project } from "@/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-[13px] text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-text-primary">{children}</dd>
    </div>
  );
}

/** Read-only Git metadata block (branch / HEAD / working tree / remote / sync). */
export function ProjectGitInfo({ project }: { project: Project }) {
  const { t } = useI18n();
  const tree = workingTreeStatus(project.workingTree);
  const modified = project.modified ?? 0;
  const head = project.head ?? (project.lastCommitHash || "—");

  return (
    <Card>
      <SectionHeading title={t("section.git", "Git")} />
      <dl className="px-5 pb-5">
        <Field label={t("project.branch", "Branch")}>
          <span className="font-mono">{project.branch}</span>
        </Field>
        <Field label={t("project.head", "HEAD")}>
          <span className="break-all font-mono">{head}</span>
        </Field>
        <Field label={t("project.workingTree", "Working Tree")}>
          <span className="inline-flex items-center gap-2">
            <StatusBadge tone={tree.tone}>
              {t(`status.${tree.key}`, tree.label)}
            </StatusBadge>
            {modified > 0 && (
              <span className="text-[12px] text-text-muted">
                {t("project.modifiedFiles", "{n} files modified", { n: modified })}
              </span>
            )}
          </span>
        </Field>
        <Field label={t("project.remote", "Remote")}>
          <span className="break-all font-mono">
            {project.remote ?? t("project.noRemote", "No remote")}
          </span>
        </Field>
        <Field label={t("project.ahead", "Ahead")}>
          <span className="font-mono">{project.ahead ?? "—"}</span>
        </Field>
        <Field label={t("project.behind", "Behind")}>
          <span className="font-mono">{project.behind ?? "—"}</span>
        </Field>
      </dl>
    </Card>
  );
}