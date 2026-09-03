"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  LivePill,
  OfflineBanner,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { ResearchDetail } from "@/components/research/ResearchDetail";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import {
  useDatasets,
  useProjects,
  useResearchDetail,
  useResearchProjects,
} from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import {
  isResearchType,
  RESEARCH_META,
  type ResearchResolvers,
} from "@/lib/research";

export default function ResearchDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const rawType = params?.type ?? "";
  const id = params?.id ?? "";
  const { t } = useI18n();
  const { data: item, loading } = useResearchDetail(
    isResearchType(rawType) ? rawType : "projects",
    id,
  );
  const { data: codeProjects } = useProjects();
  const { data: researchProjects } = useResearchProjects();
  const { data: datasets } = useDatasets();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (!isResearchType(rawType)) notFound();

  const type = rawType;
  const meta = RESEARCH_META[type];

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  if (!item) {
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
        <PageHeader title={t("research.notFound", "Research resource not found")} />
        <Link
          href={`/research/${type}`}
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
          {t(meta.labelKey, meta.plural)}
        </Link>
      </div>
    );
  }

  const resolve: ResearchResolvers = {
    codeProjectName: (pid) => codeProjects?.find((c) => c.id === pid)?.name,
    researchProjectName: (rid) => researchProjects?.find((r) => r.id === rid)?.name,
    datasetName: (did) => datasets?.find((d) => d.id === did)?.name,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href={`/research/${type}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t(meta.labelKey, meta.plural)}
      </Link>

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <ResearchDetail type={type} item={item} resolve={resolve} />

      <div className="flex items-center gap-2 text-[12px] text-text-muted">
        <LivePill />
      </div>
    </div>
  );
}