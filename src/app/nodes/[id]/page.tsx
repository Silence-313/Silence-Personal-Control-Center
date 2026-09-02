"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Thermometer, Wifi } from "lucide-react";

import { MetricCard } from "@/components/node/MetricCard";
import { NodeStatusCard } from "@/components/node/NodeStatusCard";
import { PowerCard } from "@/components/node/PowerCard";
import {
  LivePill,
  OfflineBanner,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { ServiceList } from "@/components/service/ServiceList";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatGb } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { useRealtimeMetrics, useRealtimeNodeStatus } from "@/lib/realtime";
import { nodeStatus } from "@/lib/status";
import { useMetrics, useNode, useServices } from "@/hooks";
import type { NodeStatus } from "@/types";

export default function NodeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { t } = useI18n();

  const { data: node, loading: nodeLoading } = useNode(id);
  const { data: restMetrics, loading: metricsLoading } = useMetrics();
  const { data: services, loading: servicesLoading } = useServices();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";
  const liveMetrics = useRealtimeMetrics();
  const liveNodeStatus = useRealtimeNodeStatus();
  const metrics = liveMetrics ?? restMetrics;
  const statusOverride: NodeStatus | undefined = sleeping
    ? "sleeping"
    : offline
      ? "offline"
      : (liveNodeStatus?.status ?? undefined);

  const loading = nodeLoading || metricsLoading || servicesLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  if (!node) {
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
        <PageHeader title={t("common.notFound", "Node not found")} />
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
          {t("common.back", "Dashboard")}
        </Link>
      </div>
    );
  }

  const dockerServices = (services ?? []).filter((s) => s.type === "docker");
  const header = nodeStatus(statusOverride ?? node.status);

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
        {t("common.back", "Dashboard")}
      </Link>

      <PageHeader
        title={node.name}
        description={`${node.model} · ${node.hardware.chip}`}
        actions={
          <div className="flex items-center gap-3">
            <LivePill />
            <StatusBadge tone={header.tone} pulsing={header.key === "online"}>
              {t(`status.${header.key}`, header.label)}
            </StatusBadge>
          </div>
        }
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="md:col-span-2 lg:col-span-4">
          <NodeStatusCard node={node} statusOverride={statusOverride} />
        </div>

        {metrics && (
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            <MetricCard
              label={t("metric.cpu", "CPU")}
              value={`${metrics.cpu.usagePct}`}
              unit="%"
              sublabel={t("metric.cpuSublabel", "{load} load · {cores} cores", {
                load: metrics.cpu.loadAvg.toFixed(2),
                cores: metrics.cpu.cores,
              })}
              history={metrics.cpu.history}
              icon={Cpu}
            />
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
            <MetricCard
              label={t("metric.network", "Network")}
              value={`${metrics.network.downMbps}`}
              unit="Mbps"
              sublabel={`↑ ${metrics.network.upMbps} Mbps`}
              icon={Wifi}
            />
            <MetricCard
              label={t("metric.temperature", "Temperature")}
              value={metrics.temperatureC > 0 ? `${metrics.temperatureC}` : "—"}
              unit="°C"
              icon={Thermometer}
            />
            <Card className="sm:col-span-2">
              <SectionHeading title={t("section.storage", "Storage")} />
              <div className="px-5 pb-5">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-text-primary">
                    {formatGb(metrics.storage.usedGb, 0)}
                  </span>
                  <span className="text-sm text-text-secondary">
                    / {formatGb(metrics.storage.totalGb, 0)}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-info"
                    style={{ width: `${metrics.storage.usagePct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px] text-text-muted">
                  <span>
                    {metrics.storage.usagePct}% {t("label.used", "used")}
                  </span>
                  <HardDrive className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* System + Hardware + Power */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <SectionHeading title={t("section.system", "System")} className="px-0 pt-0" />
          <dl className="space-y-2 text-[13px]">
            {[
              [t("label.platform", "Platform"), `${node.platform} (${node.architecture})`],
              [t("label.os", "OS"), node.osVersion],
              [t("label.ip", "IP"), node.ip],
              [t("label.uptime", "Uptime"), node.uptime],
              [
                t("label.lastSeen", "Last seen"),
                node.lastSeen === "—" ? "—" : t("label.lastSeenNow", "just now"),
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-text-muted">{k}</dt>
                <dd className="text-right font-mono text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
            {node.capabilities.map((c) => (
              <span
                key={c}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary"
              >
                {c}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeading title={t("section.hardware", "Hardware")} className="px-0 pt-0" />
          <dl className="space-y-2 text-[13px]">
            {[
              [t("label.chip", "Chip"), node.hardware.chip],
              [
                t("label.cores", "Cores"),
                t("node.coresDetail", "{p}P / {e}E", {
                  p: node.hardware.performanceCores,
                  e: node.hardware.efficiencyCores,
                }),
              ],
              [t("metric.memory", "Memory"), `${node.hardware.memoryGb} GB`],
              [t("label.gpu", "GPU"), node.hardware.gpu],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-text-muted">{k}</dt>
                <dd className="text-right text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <PowerCard node={node} />
      </div>

      {/* Docker + Services */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading
            title={t("section.docker", "Docker")}
            action={
              <span className="text-[12px] tabular-nums text-text-muted">
                {dockerServices.filter((s) => s.status === "running").length}{" "}
                {t("status.running", "running")}
              </span>
            }
          />
          <ServiceList services={dockerServices} />
        </Card>
        <Card>
          <SectionHeading title={t("section.services", "Services")} />
          <ServiceList services={(services ?? []).filter((s) => s.type !== "docker")} />
        </Card>
      </div>
    </div>
  );
}