"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  /** Ensures a minimum touch target for iPad. */
  size?: "md" | "sm";
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-black font-semibold hover:brightness-110 active:brightness-95 border border-transparent",
  secondary:
    "bg-surface-2 text-text-primary border border-border-strong hover:bg-surface-3 active:bg-surface-3",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-text-primary hover:bg-surface-2 active:bg-surface-3",
  danger:
    "bg-error/10 text-error border border-error/40 hover:bg-error/20 active:bg-error/20",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "h-11 px-4 text-[15px]",
  sm: "h-9 px-3 text-[13px]",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}