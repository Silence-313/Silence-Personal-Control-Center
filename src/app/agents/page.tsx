"use client";

import { AgentCard } from "@/components/agent/AgentCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/i18n";
import { useAgents } from "@/hooks";

export default function AgentsPage() {
  const { t } = useI18n();
  const { data: agents, loading } = useAgents();

  if (loading || !agents) {
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

  const running = agents.filter((a) => a.status === "running").length;
  const idle = agents.filter((a) => a.status === "idle").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.agents", "Agents")}
        description={t(
          "page.agentsDesc",
          "{count} agents · {running} running · {idle} idle",
          { count: agents.length, running, idle },
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}