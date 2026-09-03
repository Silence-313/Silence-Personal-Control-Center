"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { runtimeStateOf, type RuntimeState } from "@/lib/research";
import type { StatusTone } from "@/lib/status";
import type { ResearchRuntime } from "@/types";

const TONE: Record<RuntimeState, StatusTone> = {
  exists: "success",
  missing: "neutral",
  error: "error",
  stale: "warning",
};

const KEY: Record<RuntimeState, string> = {
  exists: "research.runtimeExists",
  missing: "research.runtimeMissing",
  error: "research.runtimeError",
  stale: "research.runtimeStale",
};

const LABEL: Record<RuntimeState, string> = {
  exists: "On disk",
  missing: "Missing",
  error: "Error",
  stale: "Stale",
};

export function RuntimeBadge({
  runtime,
  className,
}: {
  runtime?: ResearchRuntime | null;
  className?: string;
}) {
  const { t } = useI18n();
  const state = runtimeStateOf(runtime);
  return (
    <StatusBadge tone={TONE[state]} className={className}>
      {t(KEY[state], LABEL[state])}
    </StatusBadge>
  );
}