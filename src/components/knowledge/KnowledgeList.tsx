"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n";
import { KNOWLEDGE_TYPES, TYPE_LABEL } from "@/lib/knowledge";
import type { KnowledgeItem } from "@/types";

interface KnowledgeListProps {
  items: KnowledgeItem[];
}

export function KnowledgeList({ items }: KnowledgeListProps) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  const filtered = useMemo(() => {
    let out = items;
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter(
        (i) =>
          i.title.toLowerCase().includes(needle) ||
          i.summary.toLowerCase().includes(needle) ||
          i.tags.some((tag) => tag.toLowerCase().includes(needle)),
      );
    }
    if (type) out = out.filter((i) => i.type === type);
    return out;
  }, [items, q, type]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("knowledge.searchPlaceholder", "Search knowledge…")}
          className="min-w-[200px] flex-1 rounded-control border border-border-soft bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
          aria-label={t("knowledge.searchPlaceholder", "Search knowledge…")}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-control border border-border-soft bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-strong focus:outline-none"
          aria-label={t("knowledge.typeFilter", "Filter by type")}
        >
          <option value="">{t("filter.all", "All types")}</option>
          {KNOWLEDGE_TYPES.map((k) => (
            <option key={k} value={k}>
              {t(`type.${k}`, TYPE_LABEL[k])}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-text-muted">
          {t("knowledge.empty", "No knowledge items yet.")}
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link href={`/context/${item.type}/${item.entityId}`} className="block h-full">
                <Card interactive className="h-full p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary">{item.title}</span>
                    <span className="shrink-0 rounded-control bg-surface-3 px-2 py-0.5 text-[11px] text-text-secondary">
                      {t(`type.${item.type}`, TYPE_LABEL[item.type])}
                    </span>
                  </div>
                  {item.summary && (
                    <p className="mt-1 text-[13px] leading-snug text-text-secondary">
                      {item.summary}
                    </p>
                  )}
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}