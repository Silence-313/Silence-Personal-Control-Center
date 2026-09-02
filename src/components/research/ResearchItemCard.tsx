"use client";

import {
  BookOpen,
  Database,
  FileText,
  FlaskConical,
  FolderGit2,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { researchStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { ResearchItem, ResearchType } from "@/types";

const RESEARCH_META: Record<ResearchType, { icon: LucideIcon; label: string }> = {
  papers: { icon: FileText, label: "Paper" },
  projects: { icon: FolderGit2, label: "Project" },
  experiments: { icon: FlaskConical, label: "Experiment" },
  notes: { icon: BookOpen, label: "Note" },
  datasets: { icon: Database, label: "Dataset" },
  reports: { icon: FileText, label: "Report" },
};

export function ResearchItemCard({ item }: { item: ResearchItem }) {
  const { t } = useI18n();
  const meta = RESEARCH_META[item.type];
  const Icon = meta.icon;
  const status = researchStatus(item.status);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border-soft bg-surface-2">
          <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {t(`type.${item.type}`, meta.label)}
            </span>
            <StatusBadge tone={status.tone} className="shrink-0">
              {t(`status.${status.key}`, status.label)}
            </StatusBadge>
          </div>
          <h3 className="mt-1 truncate text-[15px] font-semibold text-text-primary">
            {item.title}
          </h3>
        </div>
      </div>

      {item.summary && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-text-secondary">
          {item.summary}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="flex flex-wrap gap-1">
          {item.tags?.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <span className="shrink-0 text-[12px] text-text-muted">
          {item.updatedAt}
        </span>
      </div>
    </Card>
  );
}