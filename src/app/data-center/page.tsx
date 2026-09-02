"use client";

import { StorageOverview } from "@/components/storage/StorageOverview";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/i18n";
import { useStorage } from "@/hooks";

export default function DataCenterPage() {
  const { t } = useI18n();
  const { data: storage, loading } = useStorage();

  if (loading || !storage) {
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
        title={t("page.dataCenter", "Data Center")}
        description={t(
          "page.dataCenterDesc",
          "Personal AI Data Center — the 2TB data layer for datasets, models, experiments and more.",
        )}
      />

      <Card>
        <SectionHeading
          title={t("page.storageTitle", "{name} · Storage", { name: storage.driveName })}
        />
        <div className="px-5 pb-5">
          <StorageOverview storage={storage} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {storage.categories.map((cat) => {
          const pct = ((cat.sizeGb / storage.totalGb) * 100).toFixed(0);
          return (
            <Card key={cat.key} className="p-4">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
                {t(`storage.cat.${cat.key}`, cat.label)}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-text-primary">
                {cat.sizeGb} GB
              </div>
              <div className="mt-1 text-[12px] text-text-muted">
                {t("storage.ofDrive", "{p}% of drive", { p: pct })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}