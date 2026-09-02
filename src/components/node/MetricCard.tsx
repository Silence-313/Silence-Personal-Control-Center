import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import type { StatusTone } from "@/lib/status";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  history?: number[];
  icon: LucideIcon;
  tone?: StatusTone;
}

export function MetricCard({
  label,
  value,
  unit,
  sublabel,
  history,
  icon: Icon,
  tone = "info",
}: MetricCardProps) {
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-text-primary">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-text-secondary">{unit}</span>
        )}
      </div>

      {history && history.length >= 2 && (
        <Sparkline
          data={history}
          tone={tone}
          className="mt-3 h-8 flex-1"
        />
      )}

      {sublabel && (
        <div className="mt-2 truncate text-[12px] text-text-secondary">
          {sublabel}
        </div>
      )}
    </Card>
  );
}