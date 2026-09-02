import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  /** Optional right-aligned action (e.g. a "View all" link). */
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ title, action, className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 pt-4 pb-3",
        className,
      )}
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      {action}
    </div>
  );
}