"use client";

import { Cpu, HardDrive, MemoryStick, Wifi } from "lucide-react";

import { AgentList } from "@/components/agent/AgentList";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { NodeStatusCard } from "@/components/node/NodeStatusCard";
import { MetricCard } from "@/components/node/MetricCard";
import { PowerRingButton } from "@/components/node/PowerRingButton";
import { ProjectList } from "@/components/project/ProjectList";
import { DockerStatusCard } from "@/components/service/DockerStatusCard";
import { TaskList } from "@/components/task/TaskList";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { ViewAllLink } from "@/components/ui/ViewAllLink";
import {
  LivePill,
  OfflineBanner,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { formatGb } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { useRealtimeMetrics, useRealtimeNodeStatus } from "@/lib/realtime";
import type { NodeStatus } from "@/types";
import {
  useActivities,
  useAgents,
  useMetrics,
  useNodes,
  useProjects,
  useServices,
  useTasks,
} from "@/hooks";

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: nodes, loading: nodesLoading } = useNodes();
  const { data: restMetrics, loading: metricsLoading } = useMetrics();
  const { data: projects, loading: projectsLoading } = useProjects();
  const { data: agents, loading: agentsLoading } = useAgents();
  const { data: services, loading: servicesLoading } = useServices();
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: activities, loading: activitiesLoading } = useActivities();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";
  const liveMetrics = useRealtimeMetrics();
  const liveNodeStatus = useRealtimeNodeStatus();
  const metrics = liveMetrics ?? restMetrics;
  const nodeStatusOverride: NodeStatus | undefined = sleeping
    ? "sleeping"
    : offline
      ? "offline"
      : (liveNodeStatus?.status ?? undefined);

  const loading =
    nodesLoading ||
    metricsLoading ||
    projectsLoading ||
    agentsLoading ||
    servicesLoading ||
    tasksLoading ||
    activitiesLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  const node = nodes?.[0];

  if (!node) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title={t("page.dashboard", "Dashboard")}
          description={t(
            "page.dashboardDesc",
            "Your personal research environment at a glance.",
          )}
        />
        {sleeping && <SleepingBanner />}
        <OfflineState />
      </div>
    );
  }

  const dockerServices = (services ?? []).filter((s) => s.type === "docker");
  const dockerRunning = dockerServices.filter((s) => s.status === "running").length;
  const dockerStopped = dockerServices.length - dockerRunning;

  const agentRegistered = (agents ?? []).length;
  const agentRunning = (agents ?? []).filter((a) => a.status === "running").length;
  const agentIdle = (agents ?? []).filter((a) => a.status === "idle").length;
  const agentOffline = (agents ?? []).filter((a) => a.status === "offline").length;
  const agentError = (agents ?? []).filter((a) => a.status === "error").length;
  const agentUnknown = (agents ?? []).filter((a) => a.status === "unknown").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.dashboard", "Dashboard")}
        description={t(
          "page.dashboardDesc",
          "Your personal research environment at a glance.",
        )}
        actions={
          <div className="flex items-center gap-3">
            <LivePill />
            <PowerRingButton node={node} />
          </div>
        }
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      {/* System overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        {node && (
          <div className="md:col-span-2 lg:col-span-4">
            <NodeStatusCard node={node} statusOverride={nodeStatusOverride} />
          </div>
        )}

        {metrics && (
          <>
            <div className="md:col-span-1 lg:col-span-2">
              <MetricCard
                label={t("metric.cpu", "CPU")}
                value={`${metrics.cpu.usagePct}`}
                unit="%"
                sublabel={t(
                  "metric.cpuSublabel",
                  "{load} load · {cores} cores",
                  {
                    load: metrics.cpu.loadAvg.toFixed(2),
                    cores: metrics.cpu.cores,
                  },
                )}
                history={metrics.cpu.history}
                icon={Cpu}
              />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <MetricCard
                label={t("metric.memory", "Memory")}
                value={`${metrics.memory.usedGb}`}
                unit="GB"
                sublabel={t("label.of", "of {value}", {
                  value: `${metrics.memory.totalGb} GB`,
                })}
                history={metrics.memory.history}
                icon={MemoryStick}
              />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <MetricCard
                label={t("metric.storage", "Storage")}
                value={formatGb(metrics.storage.usedGb, 0)}
                sublabel={t("label.of", "of {value}", {
                  value: formatGb(metrics.storage.totalGb, 0),
                })}
                icon={HardDrive}
              />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <MetricCard
                label={t("metric.network", "Network")}
                value={`${metrics.network.downMbps}`}
                unit="Mbps"
                sublabel={`↑ ${metrics.network.upMbps} Mbps`}
                icon={Wifi}
              />
            </div>
          </>
        )}
      </div>

      {/* Projects + Agents */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading
            title={t("section.projects", "Projects")}
            action={<ViewAllLink href="/projects" />}
          />
          {projects && <ProjectList projects={projects.slice(0, 5)} />}
        </Card>

        <Card>
          <SectionHeading
            title={t("section.agents", "Agents")}
            action={<ViewAllLink href="/agents" />}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-3 text-[12px] text-text-muted">
            <span>
              {t("agent.registered", "Registered")}:{" "}
              <b className="font-semibold text-text-primary">{agentRegistered}</b>
            </span>
            <span>
              {t("status.running", "Running")}:{" "}
              <b className="font-semibold text-text-primary">{agentRunning}</b>
            </span>
            <span>
              {t("status.idle", "Idle")}:{" "}
              <b className="font-semibold text-text-primary">{agentIdle}</b>
            </span>
            <span>
              {t("status.offline", "Offline")}:{" "}
              <b className="font-semibold text-text-primary">{agentOffline}</b>
            </span>
            <span>
              {t("status.error", "Error")}:{" "}
              <b className="font-semibold text-text-primary">{agentError}</b>
            </span>
            <span>
              {t("status.unknown", "Unknown")}:{" "}
              <b className="font-semibold text-text-primary">{agentUnknown}</b>
            </span>
          </div>
          {agents && <AgentList agents={agents.slice(0, 5)} />}
        </Card>
      </div>

      {/* Docker + Current tasks */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <DockerStatusCard
            services={services ?? []}
            running={dockerRunning}
            stopped={dockerStopped}
          />
        </div>
        <Card className="lg:col-span-7">
          <SectionHeading title={t("section.currentTasks", "Current Tasks")} />
          {tasks && <TaskList tasks={tasks} />}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <SectionHeading
          title={t("section.recentActivity", "Recent Activity")}
          action={<ViewAllLink href="/activity" />}
        />
        {activities && <ActivityTimeline activities={activities.slice(0, 6)} />}
      </Card>
    </div>
  );
}