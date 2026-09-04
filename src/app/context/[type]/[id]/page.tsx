"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ContextView } from "@/components/knowledge/ContextView";
import {
  LivePill,
  OfflineBanner,
  OfflineState,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useContextData } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { isKnowledgeType } from "@/lib/knowledge";
import { useReachability } from "@/lib/reachability";

export default function ContextPage() {
  const params = useParams<{ type: string; id: string }>();
  const rawType = params?.type ?? "";
  const id = params?.id ?? "";
  const { t } = useI18n();
  const { data, loading } = useContextData(rawType, id);
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (!isKnowledgeType(rawType)) notFound();

  const type = rawType;

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  if (!data) {
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
        <PageHeader title={t("context.notFound", "Context not found")} />
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
          {t("knowledge.back", "Back to knowledge")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
        {t("knowledge.back", "Back to knowledge")}
      </Link>

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <ContextView context={data} />

      <div className="flex items-center gap-2 text-[12px] text-text-muted">
        <LivePill />
        {t("context.title", "Context")} · {type}/{id}
      </div>
    </div>
  );
}