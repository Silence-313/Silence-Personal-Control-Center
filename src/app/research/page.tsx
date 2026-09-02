"use client";

import { useState } from "react";

import { ResearchItemCard } from "@/components/research/ResearchItemCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useResearch } from "@/hooks";
import type { ResearchType } from "@/types";

const FILTERS: Array<{ key: ResearchType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "papers", label: "Papers" },
  { key: "projects", label: "Projects" },
  { key: "experiments", label: "Experiments" },
  { key: "notes", label: "Notes" },
  { key: "datasets", label: "Datasets" },
  { key: "reports", label: "Reports" },
];

export default function ResearchPage() {
  const { t } = useI18n();
  const { data: items, loading } = useResearch();
  const [filter, setFilter] = useState<ResearchType | "all">("all");

  if (loading || !items) {
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

  const visible =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={t("page.research", "Research")}
        description={t(
          "page.researchDesc",
          "Papers, projects, experiments, notes, datasets and reports — the beginnings of a Research OS.",
        )}
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent/15 text-text-primary ring-1 ring-accent/50"
                  : "bg-surface text-text-secondary ring-1 ring-border-soft hover:text-text-primary",
              )}
            >
              {f.key === "all" ? t("filter.all", "All") : t(`type.${f.key}`, f.label)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <ResearchItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}