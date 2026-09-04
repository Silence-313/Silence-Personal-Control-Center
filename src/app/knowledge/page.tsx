"use client";

import { AutomationRules } from "@/components/knowledge/AutomationRules";
import { KnowledgeList } from "@/components/knowledge/KnowledgeList";
import {
  LivePill,
  OfflineBanner,
  SleepingBanner,
} from "@/components/reachability/ReachabilityNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useAutomationRules, useKnowledgeItems } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";

export default function KnowledgePage() {
  const { t } = useI18n();
  const items = useKnowledgeItems();
  const rules = useAutomationRules();
  const { status: reach } = useReachability();
  const sleeping = reach === "sleeping";
  const offline = reach === "offline";

  if (items.loading && !items.data) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.knowledge", "Knowledge")}
        description={t(
          "page.knowledgeDesc",
          "Auto-indexed knowledge graph — a relational view of projects, agents, research, sessions and activities.",
        )}
        actions={<LivePill />}
      />

      {sleeping && <SleepingBanner />}
      {offline && !sleeping && <OfflineBanner />}

      <KnowledgeList items={items.data ?? []} />

      <AutomationRules rules={rules.data ?? []} />
    </div>
  );
}