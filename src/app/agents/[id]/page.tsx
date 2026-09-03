"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AgentSessionList } from "@/components/agent/AgentSessionList";
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
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { agentStatus } from "@/lib/status";
import { useActivities, useAgent, useAgentSessions, useNodes, useProjects } from "@/hooks";

function humanizeCapability(cap: string): string {
  return cap
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-[13px] text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-text-primary">{children}</dd>
    </div>
  );
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { t } = useI18n();

  const { data: agent, loading } = useAgent(id);
  const { data: sessions } = useAgentSessions(id);
  const { data: nodes } = useNodes();
  const { data: projects } = useProjects();
  const { data: activities } = useActivities();
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

  if (!agent) {
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
        <PageHeader title={t("agent.notFound", "Agent not found")} />
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("agent.back", "Agents")}
        </Link>
      </div>
    );
  }

  const status = agentStatus(agent.status);
  const nodeName = nodes?.find((n) => n.id === agent.nodeId)?.name ?? agent.nodeId;
  const projectName = agent.currentProjectId
    ? projects?.find((p) => p.id === agent.currentProjectId)?.name ?? agent.currentProjectId
    : null;
  const agentActivities = (activities ?? []).filter((a) => a.agentId === agent.id).slice(0, 6);

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("agent.back", "Agents")}
      </Link>

      <PageHeader
        title={agent.name}
        description={`${agent.type} · ${nodeName}`}
        actions={
          <div className="flex items-center gap-3">
            <LivePill />
            <StatusBadge tone={status.tone} pulsing={agent.status === "running"}>
              {t(`status.${status.key}`, status.label)}
            </StatusBadge>
          </div>
        }
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t("section.identity", "Identity")} />
          <dl className="px-5 pb-5">
            <Field label={t("label.node", "Node")}>
              <span className="font-mono">{nodeName}</span>
            </Field>
            <Field label={t("label.type", "Type")}>
              <span className="font-mono">{agent.type}</span>
            </Field>
            <Field label={t("label.description", "Description")}>
              <span>{agent.description || "—"}</span>
            </Field>
          </dl>
        </Card>

        <Card>
          <SectionHeading title={t("section.association", "Association")} />
          <dl className="px-5 pb-5">
            <Field label={t("label.currentProject", "Current Project")}>
              <span>{projectName ?? "—"}</span>
            </Field>
            <Field label={t("label.currentSession", "Current Session")}>
              {agent.currentSessionId ? (
                <span className="break-all font-mono">{agent.currentSessionId}</span>
              ) : (
                <span className="text-text-muted">{t("agent.noSession", "No active session")}</span>
              )}
            </Field>
            <Field label={t("label.currentTask", "Current Task")}>
              <span>{agent.currentTask ?? "—"}</span>
            </Field>
            <Field label={t("label.lastActivity", "Last Activity")}>
              <span>{agent.lastActivityAt ? formatRelativeAgo(agent.lastActivityAt) : "—"}</span>
            </Field>
          </dl>
        </Card>
      </div>

      <Card>
        <SectionHeading title={t("label.capabilities", "Capabilities")} />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {agent.capabilities.length > 0 ? (
            agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-full border border-border-soft bg-surface-2 px-2.5 py-1 text-[12px] text-text-secondary"
              >
                {humanizeCapability(cap)}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-text-muted">—</span>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t("agent.recentSessions", "Recent Sessions")} />
          <AgentSessionList
            sessions={sessions ?? []}
            projectName={(pid) => projects?.find((p) => p.id === pid)?.name}
          />
        </Card>

        <Card>
          <SectionHeading title={t("agent.recentActivity", "Recent Activity")} />
          {agentActivities.length > 0 ? (
            <ul className="divide-y divide-border-soft px-5 pb-5">
              {agentActivities.map((a) => (
                <li key={a.id} className="py-2 text-[13px] text-text-secondary">
                  {a.message}
                  <span className="ml-2 text-[11px] text-text-muted">
                    {formatRelativeAgo(a.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 pb-5 text-[13px] text-text-muted">
              {t("agent.noRecentActivity", "No recent agent activity.")}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}