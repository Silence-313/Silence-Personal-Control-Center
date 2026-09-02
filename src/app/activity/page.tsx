"use client";

import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/i18n";
import { useActivities } from "@/hooks";
import type { Activity } from "@/types";

function startOfDay(x: Date): number {
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
}

export default function ActivityPage() {
  const { t } = useI18n();
  const { data: activities, loading } = useActivities();

  if (loading || !activities) {
    return (
      <div className="space-y-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
    if (diff === 0) return t("activity.today", "Today");
    if (diff === 1) return t("activity.yesterday", "Yesterday");
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const groups = new Map<string, Activity[]>();
  for (const item of activities) {
    const key = dayLabel(item.timestamp);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.activity", "Activity")}
        description={t(
          "page.activityDesc",
          "A unified timeline of everything happening across your environment.",
        )}
      />

      {Array.from(groups.entries()).map(([label, items]) => (
        <Card key={label}>
          <SectionHeading title={label} />
          <ActivityTimeline activities={items} />
        </Card>
      ))}
    </div>
  );
}