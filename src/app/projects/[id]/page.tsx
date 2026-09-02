"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ProjectGitInfo } from "@/components/project/ProjectGitInfo";
import {
  LivePill,
  OfflineBanner,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatClock, formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { projectHealth } from "@/lib/status";
import { useNodes, useProject } from "@/hooks";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-[13px] text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-text-primary">{children}</dd>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { t } = useI18n();

  const { data: project, loading } = useProject(id);
  const { data: nodes } = useNodes();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  if (!project) {
    if (sleeping || offline) {
      return (
        <div className="space-y-4">
          {sleeping && <SleepingBanner />}
          <OfflineState />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <PageHeader title={t("project.notFound", "Project not found")} />
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("project.back", "Projects")}
        </Link>
      </div>
    );
  }

  const health = projectHealth(project.health);
  const nodeName = nodes?.find((n) => n.id === project.nodeId)?.name ?? project.nodeId;
  const latestCommit = project.lastCommitSubject && project.lastCommitSubject !== "—"
    ? project.lastCommitSubject
    : t("project.noRecentCommit", "No commits yet");

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
        {t("project.back", "Projects")}
      </Link>

      <PageHeader
        title={project.name}
        description={`${nodeName} · ${project.repositoryType}`}
        actions={
          <div className="flex items-center gap-3">
            <LivePill />
            <StatusBadge tone={health.tone}>
              {t(`status.${health.key}`, health.label)}
            </StatusBadge>
          </div>
        }
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t("section.repository", "Repository")} />
          <dl className="px-5 pb-5">
            <Field label={t("project.node", "Node")}>
              <span className="font-mono">{nodeName}</span>
            </Field>
            <Field label={t("project.repositoryType", "Type")}>
              <span className="font-mono">{project.repositoryType}</span>
            </Field>
            <Field label={t("project.repositoryPath", "Path")}>
              <span className="break-all font-mono">{project.repositoryPath}</span>
            </Field>
            <Field label={t("project.remote", "Remote")}>
              <span className="break-all font-mono">
                {project.remote ?? t("project.noRemote", "No remote")}
              </span>
            </Field>
          </dl>
        </Card>

        <ProjectGitInfo project={project} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t("project.latestCommit", "Latest Commit")} />
          <dl className="px-5 pb-5">
            <Field label={t("project.latestCommit", "Commit")}>
              <span className="break-all">{latestCommit}</span>
            </Field>
            <Field label="Hash">
              <span className="break-all font-mono">{project.lastCommitHash || "—"}</span>
            </Field>
            <Field label={t("project.head", "HEAD")}>
              <span className="break-all font-mono">
                {project.head ?? (project.lastCommitHash || "—")}
              </span>
            </Field>
            {project.lastCommitTime && (
              <Field label={t("label.lastActivity", "Last Activity")}>
                <span>
                  {formatRelativeAgo(project.lastCommitTime)} ·{" "}
                  {formatClock(project.lastCommitTime)}
                </span>
              </Field>
            )}
          </dl>
        </Card>

        <Card>
          <SectionHeading title={t("section.activity", "Activity")} />
          <div className="px-5 pb-5 text-[13px] text-text-muted">
            {t(
              "project.activityReserved",
              "Per-project activity history is reserved for the future Execution Plane.",
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}