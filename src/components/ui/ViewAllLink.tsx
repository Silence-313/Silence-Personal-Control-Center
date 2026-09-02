"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export function ViewAllLink({ href, label }: { href: string; label?: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
    >
      {label ?? t("common.viewAll", "View all")}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}