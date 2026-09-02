"use client";

import { useI18n } from "@/lib/i18n";

export function DemoBadge() {
  const { t } = useI18n();

  return (
    <span
      className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
      title="Static mock data — no live system is connected."
    >
      {t("brand.demoData", "DEMO DATA")}
    </span>
  );
}