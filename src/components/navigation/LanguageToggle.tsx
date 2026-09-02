"use client";

import { Languages } from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * One-tap language switch. Shows the target language (中文 when in English,
 * English when in Chinese) and persists the choice.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggle } = useI18n();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
      className={cn(
        "inline-flex items-center gap-2 rounded-control border border-border-soft bg-surface-2 px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary",
        className,
      )}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span>{lang === "en" ? "中文" : "English"}</span>
    </button>
  );
}