"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, isPathActive } from "@/lib/nav";
import { useI18n } from "@/lib/i18n";

/** iOS-style tab bar for phone / narrow portrait (< lg). */
export function BottomTabs() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-surface/95 backdrop-blur lg:hidden"
      aria-label={t("brand.primary", "Primary")}
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isPathActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium"
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-accent" : "text-text-muted",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    active ? "text-text-primary" : "text-text-muted",
                  )}
                >
                  {t(`nav.${item.key}`, item.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}