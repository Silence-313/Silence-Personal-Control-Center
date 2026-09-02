"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, isPathActive } from "@/lib/nav";
import { useI18n } from "@/lib/i18n";
import { DemoBadge } from "@/components/navigation/DemoBadge";
import { LanguageToggle } from "@/components/navigation/LanguageToggle";
import { SidebarNodeStatus } from "@/components/navigation/SidebarNodeStatus";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border-soft bg-surface lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border-soft px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-control bg-accent/15">
          <span className="h-3 w-3 rounded-full bg-accent" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-wide text-text-primary">
            SILENCE
          </div>
          <div className="text-[11px] text-text-muted">
            {t("brand.controlCenter", "Control Center")}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label={t("brand.primary", "Primary")}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isPathActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors",
                    active
                      ? "bg-accent/15 text-text-primary"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-accent" : "text-text-muted",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{t(`nav.${item.key}`, item.label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border-soft p-3">
        <LanguageToggle className="w-full justify-between" />
        <DemoBadge />
        <SidebarNodeStatus />
      </div>
    </aside>
  );
}