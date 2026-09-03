"use client";

import { AgentCard } from "@/components/agent/AgentCard";
import {
  LivePill,
  OfflineBanner,
  OfflineState,
} from "@/components/reachability/ReachabilityNotice";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useAgents, useNodes, useProjects } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";

export default function AgentsPage() {
  const { t } = useI18n();
  const { data: agents, loading } = useAgents();
  const { data: nodes } = useNodes();
  const { data: projects } = useProjects();
  const { status: reach } = useReachability();
  const offline = reach === "offline";

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  if (!agents) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title={t("page.agents", "Agents")}
          description={t(
            "page.agentsDesc",
            "{count} 个智能体 · {running} 运行中 · {idle} 空闲 · {offline} 离线",
            { count: 0, running: 0, idle: 0, offline: 0 },
          )}
        />
        <OfflineState />
      </div>
    );
  }

  const running = agents.filter((a) => a.status === "running").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const offlineAgents = agents.filter((a) => a.status === "offline").length;

  const header = (
    <PageHeader
      title={t("page.agents", "Agents")}
      description={t(
        "page.agentsDesc",
        "{count} 个智能体 · {running} 运行中 · {idle} 空闲 · {offline} 离线",
        { count: agents.length, running, idle, offline: offlineAgents },
      )}
      actions={<LivePill />}
    />
  );

  if (agents.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        {header}
        <Card className="p-8 text-center text-text-muted">
          {t("agent.empty", "尚未注册任何智能体。")}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {header}
      {offline && <OfflineBanner />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            nodeName={nodes?.find((n) => n.id === agent.nodeId)?.name ?? agent.nodeId}
            projectName={projects?.find((p) => p.id === agent.currentProjectId)?.name}
          />
        ))}
      </div>
    </div>
  );
}