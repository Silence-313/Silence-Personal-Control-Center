import { cn } from "@/lib/utils";
import { TONE_DOT, type StatusTone } from "@/lib/status";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: StatusTone;
  className?: string;
}

export function ProgressBar({
  value,
  tone = "info",
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", TONE_DOT[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}