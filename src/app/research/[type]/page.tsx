"use client";

import { useParams, notFound } from "next/navigation";

import {
  LivePill,
  OfflineBanner,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { ResearchList } from "@/components/research/ResearchList";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useResearchList } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { isResearchType, RESEARCH_META } from "@/lib/research";

export default function ResearchListPage() {
  const params = useParams<{ type: string }>();
  const rawType = params?.type ?? "";
  const { t } = useI18n();
  const { data, loading } = useResearchList(isResearchType(rawType) ? rawType : "projects");
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (!isResearchType(rawType)) notFound();

  const type = rawType;
  const meta = RESEARCH_META[type];
  const items = data ?? [];

  if (loading && !data) {
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

  if (items.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title={t(meta.labelKey, meta.plural)}
          description={t("research.itemCount", "{count} items", { count: 0 })}
          actions={<LivePill />}
        />
        {sleeping && <SleepingBanner />}
        {offline && !sleeping && <OfflineBanner />}
        <Card className="p-8 text-center text-text-muted">
          {t("research.empty", "Nothing here yet.")}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t(meta.labelKey, meta.plural)}
        description={t("research.itemCount", "{count} items", { count: items.length })}
        actions={<LivePill />}
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <ResearchList type={type} items={items} />
    </div>
  );
}