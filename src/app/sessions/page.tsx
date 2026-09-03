"use client";

import {
  LivePill,
  OfflineBanner,
  OfflineState,
} from "@/components/reachability/ReachabilityNotice";
import { SessionCard } from "@/components/session/SessionCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useSessions } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";

export default function SessionsPage() {
  const { t } = useI18n();
  const { data: sessions, loading } = useSessions();
  const { status: reach } = useReachability();
  const offline = reach === "offline";

  if (loading && !sessions) {
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

  if (!sessions) {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader title={t("sessions.title", "Sessions")} />
        <OfflineState />
      </div>
    );
  }

  const header = (
    <PageHeader
      title={t("sessions.title", "Sessions")}
      description={t("sessions.itemCount", "{count} sessions", {
        count: sessions.length,
      })}
      actions={<LivePill />}
    />
  );

  if (sessions.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        {header}
        <Card className="p-8 text-center text-text-muted">
          {t("sessions.empty", "No sessions yet.")}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {header}
      {offline && <OfflineBanner />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}