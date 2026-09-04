"use client";

import { USE_MOCK } from "@/lib/data-source";
import { useI18n } from "@/lib/i18n";

/**
 * Global "whole app is demo" banner pill, shown only in full mock mode.
 * (When the backend is enabled, individual mock-only sections carry their own
 * `MockDataBadge` instead.)
 */
export function DemoBadge() {
  const { t } = useI18n();

  if (!USE_MOCK) return null;

  return (
    <span
      className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
      title="Static mock data — no live system is connected."
    >
      {t("brand.demoData", "DEMO DATA")}
    </span>
  );
}