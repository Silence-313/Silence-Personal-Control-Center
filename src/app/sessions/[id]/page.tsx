"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
import { useSession } from "@/hooks";
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { sessionStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { t } = useI18n();
  const { data: session, loading } = useSession(id);
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  if (!session) {
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
        <PageHeader title={t("sessions.notFound", "Session not found")} />
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("sessions.back", "Back to sessions")}
        </Link>
      </div>
    );
  }

  const visual = sessionStatus(session.status);

  const fields = [
    { label: t("label.agent", "Agent"), value: session.agentId, mono: true },
    { label: t("label.node", "Node"), value: session.nodeId, mono: true },
    { label: t("label.started", "Started"), value: formatRelativeAgo(session.startedAt) },
    ...(session.endedAt
      ? [{ label: t("label.ended", "Ended"), value: formatRelativeAgo(session.endedAt), mono: false }]
      : []),
    { label: t("label.lastActivity", "Last activity"), value: formatRelativeAgo(session.lastActivityAt) },
    ...(session.currentTask
      ? [{ label: t("label.currentTask", "Current task"), value: session.currentTask, mono: false }]
      : []),
  ];

  const links = [
    ...(session.projectId
      ? [{ href: `/projects/${session.projectId}`, label: `project:${session.projectId}` }]
      : []),
    ...(session.researchProjectId
      ? [
          {
            href: `/research/projects/${session.researchProjectId}`,
            label: `research:${session.researchProjectId}`,
          },
        ]
      : []),
    { href: `/agents/${session.agentId}`, label: `agent:${session.agentId}` },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("sessions.back", "Back to sessions")}
      </Link>

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <PageHeader
        title={session.id}
        description={t("sessions.detailDesc", "Session lifecycle record")}
        actions={
          <StatusBadge tone={visual.tone}>
            {t(`status.${visual.key}`, visual.label)}
          </StatusBadge>
        }
      />

      <Card>
        <SectionHeading title={t("sessions.overview", "Overview")} />
        <dl className="px-5 pb-5">
          {fields.map((f, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-1.5">
              <dt className="shrink-0 text-[13px] text-text-muted">{f.label}</dt>
              <dd
                className={cn(
                  "min-w-0 break-all text-right text-[13px] text-text-primary",
                  f.mono && "font-mono",
                )}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <SectionHeading title={t("section.association", "Associations")} />
        <div className="flex flex-wrap gap-1.5 px-5 pb-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-border-soft bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-2 text-[12px] text-text-muted">
        <LivePill />
      </div>
    </div>
  );
}