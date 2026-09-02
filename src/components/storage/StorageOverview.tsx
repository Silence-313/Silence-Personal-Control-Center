"use client";

import { formatGb } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { StorageOverview as StorageOverviewType } from "@/types";

/**
 * Categorical palette for data-viz segments (kept in one place — not theme
 * tokens, since these are arbitrary categorical hues, one per storage bucket).
 */
const CATEGORY_COLORS = [
  "#59b7ff", // datasets — azure
  "#7aa2f7", // models — periwinkle
  "#4fd1c5", // videos — teal
  "#d29922", // experiments — amber
  "#3fb950", // papers — green
  "#8b949e", // backups — gray
];

export function StorageOverview({
  storage,
}: {
  storage: StorageOverviewType;
}) {
  const { t } = useI18n();
  const usagePct = (storage.usedGb / storage.totalGb) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <span className="font-mono text-3xl font-semibold tabular-nums text-text-primary">
            {formatGb(storage.usedGb, 2)}
          </span>
          <span className="ml-1 text-sm text-text-muted">
            / {formatGb(storage.totalGb, 1)}
          </span>
        </div>
        <div className="text-right text-[12px] text-text-secondary">
          <div>{t("label.free", "free")} {formatGb(storage.freeGb, 1)}</div>
          <div className="text-text-muted">
            {usagePct.toFixed(0)}% {t("label.used", "used")}
          </div>
        </div>
      </div>

      {/* stacked bar */}
      <div
        className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-3"
        role="presentation"
      >
        {storage.categories.map((cat, i) => {
          const pct = (cat.sizeGb / storage.totalGb) * 100;
          return (
            <div
              key={cat.key}
              style={{
                width: `${pct}%`,
                backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }}
              title={`${t(`storage.cat.${cat.key}`, cat.label)} — ${formatGb(cat.sizeGb, 1)}`}
            />
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {storage.categories.map((cat, i) => (
          <li key={cat.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }}
              aria-hidden="true"
            />
            <span className="flex-1 truncate text-[13px] text-text-secondary">
              {t(`storage.cat.${cat.key}`, cat.label)}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-text-primary">
              {formatGb(cat.sizeGb, 0)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-border-soft pt-3 text-[12px] text-text-muted">
        {t("label.mount", "Mount")}:{" "}
        <span className="font-mono">{storage.mountPoint}</span> ·{" "}
        {storage.driveName} ({t("label.driveNote", "Personal AI Data Center")})
      </p>
    </div>
  );
}