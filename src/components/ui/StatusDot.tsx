import { cn } from "@/lib/utils";
import { TONE_DOT, type StatusTone } from "@/lib/status";

interface StatusDotProps {
  tone: StatusTone;
  /** Pulse animation for "actively running" statuses. */
  pulsing?: boolean;
  /** Visual size (touch targets stay separate from this small dot). */
  size?: "sm" | "md";
  className?: string;
}

export function StatusDot({
  tone,
  pulsing = false,
  size = "sm",
  className,
}: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full",
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
        TONE_DOT[tone],
        pulsing && "animate-pulse-dot",
        className,
      )}
    />
  );
}