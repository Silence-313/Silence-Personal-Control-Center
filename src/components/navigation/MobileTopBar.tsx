"use client";

import { DemoBadge } from "@/components/navigation/DemoBadge";
import { LanguageToggle } from "@/components/navigation/LanguageToggle";

/** Compact top bar shown only on phone / narrow portrait (< lg). */
export function MobileTopBar() {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border-soft bg-surface px-4 lg:hidden">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
        <span className="text-[15px] font-semibold tracking-wide text-text-primary">
          SILENCE
        </span>
      </div>
      <div className="flex items-center gap-2">
        <DemoBadge />
        <LanguageToggle />
      </div>
    </div>
  );
}