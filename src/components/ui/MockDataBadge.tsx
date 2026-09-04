"use client";

import { isMockDomain, type MockOnlyDomain } from "@/lib/data-source";
import { useI18n } from "@/lib/i18n";

/**
 * Badge marking a page/section whose content is served from mock data
 * (i.e. not yet backed by a real backend implementation). Self-hiding: once a
 * domain gets a real backend, removing it from `MOCK_ONLY_DOMAINS` hides the
 * badge with no further UI changes.
 */
export function MockDataBadge({ domain }: { domain: MockOnlyDomain }) {
  const { t } = useI18n();

  if (!isMockDomain(domain)) return null;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
      title={t("mock.badgeTitle", "Demo data — not yet backed by the real backend.")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
      {t("mock.demo", "Demo")}
    </span>
  );
}