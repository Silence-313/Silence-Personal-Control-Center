"use client";

import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Activity } from "@/types";

interface TimelinePanelProps {
  activities: Activity[] | null;
  loading?: boolean;
}

/** Unified event timeline (reuses the Activity spine timeline rendering). */
export function TimelinePanel({ activities, loading }: TimelinePanelProps) {
  return (
    <Card>
      <SectionHeading title="Event Timeline" />
      {activities && activities.length > 0 ? (
        <ActivityTimeline activities={activities} />
      ) : (
        <p className="px-5 pb-4 text-sm text-text-muted">
          {loading ? "Loading…" : "No events."}
        </p>
      )}
    </Card>
  );
}