"use client";

import { MoonStar, RefreshCw, Sun, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import { useRealtimeConnection } from "@/lib/realtime";

/** Compact banner shown when the Mac is (or was requested to be) asleep. */
export function SleepingBanner() {
  const { t } = useI18n();
  const { reportAwake } = useReachability();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-border-soft bg-surface px-4 py-3">
      <MoonStar className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-text-primary">
          {t("reachability.sleeping", "Mac is sleeping")}
        </div>
        <div className="text-[12px] text-text-muted">
          {t(
            "reachability.sleepingDesc",
            "The Mac is asleep — data will refresh when it wakes.",
          )}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={reportAwake}>
        <Sun className="h-4 w-4" aria-hidden="true" />
        {t("reachability.woke", "I woke the Mac")}
      </Button>
    </div>
  );
}

/** Banner when the backend is unreachable but last-known data is still shown. */
export function OfflineBanner() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-warning/40 bg-warning/5 px-4 py-3">
      <WifiOff className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-text-primary">
          {t(
            "reachability.offlineBanner",
            "Cannot reach the Mac (showing last known data)",
          )}
        </div>
        <div className="text-[12px] text-text-muted">
          {t(
            "reachability.offlineBannerDesc",
            "The backend is unavailable; data below may be stale.",
          )}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {t("reachability.retry", "Retry")}
      </Button>
    </div>
  );
}

/** Small live/stale pill driven by the realtime connection state. */
export function LivePill() {
  const { t } = useI18n();
  const connection = useRealtimeConnection();
  const live = connection === "open";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${
        live ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-success" : "bg-warning"}`}
        aria-hidden="true"
      />
      {live ? t("realtime.live", "Live") : t("realtime.stale", "Stale")}
    </span>
  );
}

/** Full blank state for when the Mac can't be reached and no data is loaded. */
export function OfflineState() {
  const { t } = useI18n();
  const { reportAwake } = useReachability();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center">
      <MoonStar className="h-8 w-8 text-text-muted" aria-hidden="true" />
      <h3 className="text-[15px] font-semibold text-text-primary">
        {t("reachability.offlineTitle", "Cannot reach the Mac")}
      </h3>
      <p className="max-w-sm text-[13px] text-text-secondary">
        {t(
          "reachability.offlineDesc",
          "The Mac may be asleep or offline. It will recover automatically on wake.",
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={reportAwake}>
          <Sun className="h-4 w-4" aria-hidden="true" />
          {t("reachability.woke", "I woke the Mac")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("reachability.retry", "Retry")}
        </Button>
      </div>
    </div>
  );
}