"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { agentStatus } from "@/lib/status";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  nodeName?: string;
  projectName?: string;
}

function humanizeCapability(cap: string): string {
  return cap
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function AgentCard({ agent, nodeName, projectName }: AgentCardProps) {
  const { t } = useI18n();
  const status = agentStatus(agent.status);

  return (
    <Link href={`/agents/${agent.id}`} className="block h-full">
      <Card className="flex h-full flex-col p-4 transition-colors hover:border-border-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-text-primary">
              {agent.name}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-text-muted">
              {agent.type} · {agent.description}
            </div>
          </div>
          <StatusBadge
            tone={status.tone}
            pulsing={agent.status === "running"}
            className="shrink-0"
          >
            {t(`status.${status.key}`, status.label)}
          </StatusBadge>
        </div>

        <dl className="mt-3 space-y-1.5 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">{t("label.node", "Node")}</dt>
            <dd className="text-text-secondary">{nodeName ?? agent.nodeId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">{t("label.currentProject", "Current Project")}</dt>
            <dd className="min-w-0 truncate text-right text-text-secondary">
              {projectName ?? agent.currentProjectId ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">{t("label.currentSession", "Current Session")}</dt>
            <dd className="min-w-0 truncate text-right font-mono text-text-secondary">
              {agent.currentSessionId ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">{t("label.currentTask", "Current Task")}</dt>
            <dd className="min-w-0 truncate text-right text-text-secondary">
              {agent.currentTask ?? "—"}
            </dd>
          </div>
        </dl>

        {agent.capabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary"
              >
                {humanizeCapability(cap)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-border-soft pt-2 text-[12px] text-text-muted">
          {t("label.lastActivity", "Last activity")}:{" "}
          {agent.lastActivityAt ? formatRelativeAgo(agent.lastActivityAt) : "—"}
        </div>
      </Card>
    </Link>
  );
}