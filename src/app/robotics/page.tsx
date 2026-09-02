"use client";

import { RobotCard } from "@/components/robotics/RobotCard";
import { TrainingRunRow } from "@/components/robotics/TrainingRunRow";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusTone } from "@/lib/robotics";
import { titleCase } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import {
  useRoboticsExperiments,
  useRobots,
  useTrainingRuns,
} from "@/hooks";

export default function RoboticsPage() {
  const { t } = useI18n();
  const { data: robots, loading: robotsLoading } = useRobots();
  const { data: runs, loading: runsLoading } = useTrainingRuns();
  const { data: experiments, loading: expLoading } = useRoboticsExperiments();

  const loading = robotsLoading || runsLoading || expLoading;

  if (loading || !robots || !runs || !experiments) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  const latest = experiments[0];

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.robotics", "Robotics")}
        description={t(
          "page.roboticsDesc",
          "Robots, simulations, training runs and experiments — monitoring only in v0.1.",
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {robots.map((robot) => (
          <RobotCard key={robot.id} robot={robot} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t("section.trainingRuns", "Training Runs")} />
          <ul className="divide-y divide-border-soft pb-1">
            {runs.map((run) => (
              <TrainingRunRow key={run.id} run={run} />
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeading title={t("section.latestExperiment", "Latest Experiment")} />
          {latest && (
            <div className="px-5 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-text-primary">
                    {latest.name}
                  </h3>
                  <p className="mt-1 text-[13px] leading-snug text-text-secondary">
                    {latest.summary}
                  </p>
                </div>
                <StatusBadge tone={statusTone(latest.status)}>
                  {t(`status.${latest.status}`, titleCase(latest.status))}
                </StatusBadge>
              </div>
              <p className="mt-3 text-[12px] text-text-muted">
                {t("label.updated", "Updated {time}", { time: latest.updatedAt })}
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeading title={t("section.experiments", "Experiments")} />
        <ul className="divide-y divide-border-soft">
          {experiments.map((exp) => (
            <li key={exp.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-text-primary">
                  {exp.name}
                </div>
                <div className="truncate text-[12px] text-text-muted">
                  {exp.summary}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[12px] text-text-muted">{exp.updatedAt}</span>
                <StatusBadge tone={statusTone(exp.status)}>
                  {t(`status.${exp.status}`, titleCase(exp.status))}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}