import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/status";
import { TONE_TEXT } from "@/lib/status";

interface SparklineProps {
  data: number[];
  tone?: StatusTone;
  className?: string;
  height?: number;
}

/**
 * Tiny dependency-free SVG sparkline for metric history.
 */
export function Sparkline({
  data,
  tone = "info",
  className,
  height = 32,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = (i * step).toFixed(1);
    const y = (height - ((v - min) / range) * (height - 4) - 2).toFixed(1);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full", TONE_TEXT[tone], className)}
      aria-hidden="true"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}