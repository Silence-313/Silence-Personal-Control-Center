"use client";

import { ProjectCard } from "@/components/project/ProjectCard";
import {
  LivePill,
  OfflineBanner,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useProjects } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";

export default function ProjectsPage() {
  const { t } = useI18n();
  const { data: projects, loading } = useProjects();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (loading && !projects) {
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

  if (!projects || projects.length === 0) {
    if (sleeping || offline) {
      return (
        <div className="space-y-4">
          {sleeping && <SleepingBanner />}
          <OfflineState />
        </div>
      );
    }
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title={t("page.projects", "Projects")}
          description={t("project.empty", "No projects are registered yet.")}
          actions={<LivePill />}
        />
      </div>
    );
  }

  const dirty = projects.filter((p) => p.workingTree === "dirty").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.projects", "Projects")}
        description={t("page.projectsDesc", "{count} repositories · {dirty} changed", {
          count: projects.length,
          dirty,
        })}
        actions={<LivePill />}
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}