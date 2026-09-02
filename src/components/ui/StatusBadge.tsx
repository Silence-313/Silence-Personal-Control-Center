import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/StatusDot";
import {
  TONE_TEXT,
  titleCase,
  type StatusTone,
} from "@/lib/status";

interface StatusBadgeProps {
  tone: StatusTone;
  children?: ReactNode;
  /** Whether to render a leading dot. */
  dot?: boolean;
  pulsing?: boolean;
  className?: string;
}

/**
 * Compact "● Online" style label. Used across cards and lists.
 */
export function StatusBadge({
  tone,
  children,
  dot = true,
  pulsing = false,
  className,
}: StatusBadgeProps) {
  const label =
    children ?? titleCase(tone === "neutral" ? "idle" : tone);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-medium leading-none",
        TONE_TEXT[tone],
        className,
      )}
    >
      {dot && <StatusDot tone={tone} pulsing={pulsing} />}
      <span>{label}</span>
    </span>
  );
}