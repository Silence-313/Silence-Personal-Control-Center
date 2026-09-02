import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds a hover affordance for tappable cards (touch + mouse). */
  interactive?: boolean;
  as?: "div" | "article" | "button";
  onClick?: () => void;
  "aria-label"?: string;
}

export function Card({
  children,
  className,
  interactive = false,
  as = "div",
  onClick,
  ...rest
}: CardProps) {
  const base =
    "rounded-card border border-border-soft bg-surface shadow-card text-left";
  const interactivity = interactive
    ? "transition-colors hover:border-border-strong active:bg-surface-2 cursor-pointer"
    : "";

  const Tag = as;
  return (
    <Tag
      className={cn(base, interactivity, className)}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}