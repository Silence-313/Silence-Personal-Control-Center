"use client";

import { Cpu, HardDrive, MemoryStick } from "lucide-react";

import { AutomationRuns } from "@/components/observability/AutomationRuns";
import { HealthScore } from "@/components/observability/HealthScore";
import { MetricChart } from "@/components/observability/MetricChart";
import { TimelinePanel } from "@/components/observability/TimelinePanel";
import { LivePill } from "@/components/reachability/ReachabilityNotice";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import {
  useAutomationRuns,
  useEventTimeline,
  useHealthSummary,
  useMetricsHistory,
  useMetricsSummary,
} from "@/hooks";
import { useI18n } from "@/lib/i18n";

export default function ObservabilityPage() {
  const { t } = useI18n();
  const { data: history, loading: historyLoading } = useMetricsHistory({ limit: 200 });
  const { data: summary, loading: summaryLoading } = useMetricsSummary({ range: "24h" });
  const { data: health, loading: healthLoading } = useHealthSummary();
  const { data: timeline, loading: timelineLoading } = useEventTimeline({ limit: 50 });
  const { data: runs, loading: runsLoading } = useAutomationRuns();

  const loading =
    historyLoading ||
    summaryLoading ||
    healthLoading ||
    timelineLoading ||
    runsLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  const samples = history ?? [];
  const cpu = samples.map((s) => s.cpuPercent);
  const memory = samples.map((s) => s.memoryPercent);
  const disk = samples.map((s) => s.diskPercent);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.observability", "Observability")}
        description={t(
          "page.observabilityDesc",
          "Metrics history, system health and automation observability.",
        )}
        actions={<LivePill />}
      />

      {/* Health + metrics summary */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <HealthScore summary={health} />
        </div>
        <Card className="lg:col-span-8">
          <SectionHeading
            title={t("section.metricsSummary", "Metrics Summary")}
            action={
              summary && (
                <span className="text-[12px] text-text-muted">
                  {t("metricsSummary.samples", "{n} samples", {
                    n: summary.samples,
                  })}
                </span>
              )
            }
          />
          {summary ? (
            <div className="grid grid-cols-3 gap-3 px-5 pb-4">
              <SummaryStat
                icon={Cpu}
                label={t("metric.cpu", "CPU")}
                value={`${summary.cpu.average.toFixed(1)}%`}
                peak={`${summary.cpu.maximum.toFixed(1)}%`}
              />
              <SummaryStat
                icon={MemoryStick}
                label={t("metric.memory", "Memory")}
                value={`${summary.memory.average.toFixed(1)}%`}
                peak={`${summary.memory.maximum.toFixed(1)}%`}
              />
              <SummaryStat
                icon={HardDrive}
                label={t("metric.storage", "Disk")}
                value={`${summary.disk.average.toFixed(1)}%`}
              />
            </div>
          ) : (
            <p className="px-5 pb-4 text-sm text-text-muted">No summary.</p>
          )}
        </Card>
      </div>

      {/* Metric history charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricChart title={t("metric.cpu", "CPU")} values={cpu} tone="info" />
        <MetricChart
          title={t("metric.memory", "Memory")}
          values={memory}
          tone="warning"
        />
        <MetricChart title={t("metric.storage", "Disk")} values={disk} tone="neutral" />
      </div>

      {/* Timeline + automation runs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TimelinePanel activities={timeline} />
        <AutomationRuns runs={runs} />
      </div>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  peak,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  peak?: string;
}) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
      <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      {peak != null && (
        <div className="mt-0.5 text-[11px] text-text-muted">peak {peak}</div>
      )}
    </div>
  );
}