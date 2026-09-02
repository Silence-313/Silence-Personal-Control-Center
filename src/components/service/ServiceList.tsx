"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { serviceStatus, titleCase } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/types";

interface ServiceListProps {
  services: Service[];
  /** Show only this service type, or all when omitted. */
  filterType?: Service["type"];
}

export function ServiceList({ services, filterType }: ServiceListProps) {
  const { t } = useI18n();
  const list = filterType
    ? services.filter((s) => s.type === filterType)
    : services;

  if (list.length === 0) {
    return <p className="px-5 py-4 text-sm text-text-muted">No services.</p>;
  }

  return (
    <ul className="divide-y divide-border-soft">
      {list.map((s) => {
        const status = serviceStatus(s.status);
        return (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium text-text-primary">
                  {s.name}
                </span>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                  {titleCase(s.type)}
                </span>
              </div>
              {s.description && (
                <div className="mt-0.5 truncate text-[12px] text-text-muted">
                  {s.description}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {typeof s.port === "number" && (
                <span className="font-mono text-[12px] tabular-nums text-text-muted">
                  :{s.port}
                </span>
              )}
              <StatusBadge tone={status.tone} pulsing={s.status === "running"}>
                {t(`status.${status.key}`, status.label)}
              </StatusBadge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}