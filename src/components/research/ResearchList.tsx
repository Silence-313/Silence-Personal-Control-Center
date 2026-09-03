"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  toResearchListItem,
  type ResearchEntity,
  type ResearchTypeKey,
} from "@/lib/research";

import { RESEARCH_ICONS } from "./icons";
import { RuntimeBadge } from "./RuntimeBadge";

interface ResearchListProps {
  type: ResearchTypeKey;
  items: ResearchEntity[];
}

export function ResearchList({ type, items }: ResearchListProps) {
  const { t } = useI18n();
  const Icon = RESEARCH_ICONS[type];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const li = toResearchListItem(type, item);
        return (
          <Link key={item.id} href={`/research/${type}/${item.id}`} className="block h-full">
            <Card className="flex h-full flex-col p-4 transition-colors hover:border-border-strong">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border-soft bg-surface-2">
                    <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                  </span>
                  <span className="truncate text-[15px] font-semibold text-text-primary">
                    {li.title}
                  </span>
                </div>
                {li.status && (
                  <StatusBadge tone={li.status.tone} className="shrink-0">
                    {t(`status.${li.status.key}`, li.status.label)}
                  </StatusBadge>
                )}
              </div>

              {li.subtitle && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-text-secondary">
                  {li.subtitle}
                </p>
              )}

              {li.runtime !== undefined && (
                <div className="mt-2">
                  <RuntimeBadge runtime={li.runtime} />
                </div>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <div className="flex flex-wrap gap-1">
                  {li.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="shrink-0 text-[12px] text-text-muted">
                  {formatRelativeAgo(li.updatedAt)}
                </span>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}