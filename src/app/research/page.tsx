"use client";

import Link from "next/link";

import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import {
  LivePill,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { RESEARCH_ICONS } from "@/components/research/icons";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useActivities,
  useDatasets,
  useExperiments,
  usePapers,
  useResearchNotes,
  useResearchProjects,
  useResearchReports,
} from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { RESEARCH_META, RESEARCH_TYPE_KEYS, type ResearchTypeKey } from "@/lib/research";
import { datasetStatus, experimentStatus } from "@/lib/status";
import type { DatasetStatus, ResearchExperimentStatus } from "@/types";

const EXPERIMENT_STATUSES: ResearchExperimentStatus[] = [
  "planned",
  "running",
  "completed",
  "failed",
  "cancelled",
];

const DATASET_STATUSES: DatasetStatus[] = ["available", "missing", "archived"];

export default function ResearchPage() {
  const { t } = useI18n();
  const projects = useResearchProjects();
  const papers = usePapers();
  const datasets = useDatasets();
  const experiments = useExperiments();
  const reports = useResearchReports();
  const notes = useResearchNotes();
  const activities = useActivities();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  const loading =
    projects.loading || papers.loading || datasets.loading || experiments.loading;

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  if (sleeping || offline) {
    return (
      <div className="space-y-4">
        {sleeping && <SleepingBanner />}
        <OfflineState />
      </div>
    );
  }

  const counts: Record<ResearchTypeKey, number> = {
    projects: projects.data?.length ?? 0,
    papers: papers.data?.length ?? 0,
    datasets: datasets.data?.length ?? 0,
    experiments: experiments.data?.length ?? 0,
    reports: reports.data?.length ?? 0,
    notes: notes.data?.length ?? 0,
  };

  const experimentRows = EXPERIMENT_STATUSES.map((status) => ({
    status,
    viz: experimentStatus(status),
    count: experiments.data?.filter((e) => e.status === status).length ?? 0,
  }));

  const datasetRows = DATASET_STATUSES.map((status) => ({
    status,
    viz: datasetStatus(status),
    count: datasets.data?.filter((d) => d.status === status).length ?? 0,
  }));

  const recent = (activities.data ?? []).slice(0, 8);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.research", "Research")}
        description={t(
          "page.researchDesc",
          "Papers, projects, experiments, notes, datasets and reports — the beginnings of a Research OS.",
        )}
        actions={<LivePill />}
      />

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {RESEARCH_TYPE_KEYS.map((key) => {
          const meta = RESEARCH_META[key];
          const Icon = RESEARCH_ICONS[key];
          return (
            <Link key={key} href={`/research/${key}`} className="block h-full">
              <Card className="flex h-full flex-col items-start gap-3 p-4 transition-colors hover:border-border-strong">
                <span className="flex h-9 w-9 items-center justify-center rounded-control border border-border-soft bg-surface-2">
                  <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-2xl font-semibold tabular-nums text-text-primary">
                    {counts[key]}
                  </div>
                  <div className="text-[13px] text-text-muted">{t(meta.labelKey, meta.plural)}</div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t("research.experimentStatus", "Experiment status")} />
          <ul className="px-5 pb-4">
            {experimentRows.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between gap-3 border-b border-border-soft py-2 last:border-0"
              >
                <StatusBadge tone={row.viz.tone}>
                  {t(`status.${row.viz.key}`, row.viz.label)}
                </StatusBadge>
                <span className="text-[13px] tabular-nums text-text-secondary">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeading title={t("research.datasetAvailability", "Dataset availability")} />
          <ul className="px-5 pb-4">
            {datasetRows.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between gap-3 border-b border-border-soft py-2 last:border-0"
              >
                <StatusBadge tone={row.viz.tone}>
                  {t(`status.${row.viz.key}`, row.viz.label)}
                </StatusBadge>
                <span className="text-[13px] tabular-nums text-text-secondary">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionHeading title={t("research.recentActivity", "Recent activity")} />
        <ActivityTimeline activities={recent} />
      </Card>
    </div>
  );
}