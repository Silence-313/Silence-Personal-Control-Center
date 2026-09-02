"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useCommand } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import type { Node } from "@/types";

interface RoundButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  accent?: boolean;
  pulsing?: boolean;
  children: React.ReactNode;
}

function RoundButton({ label, disabled, onClick, accent, pulsing, children }: RoundButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-40 ${
          accent
            ? "border-accent bg-accent/10 text-accent ring-4 ring-accent/10 hover:bg-accent/20"
            : "border-border-strong bg-surface-2 text-text-secondary hover:border-accent hover:text-accent"
        }`}
      >
        {pulsing && (
          <span
            className="absolute inset-0 rounded-full border-2 border-accent/40 animate-ping"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

/**
 * Two always-visible circular buttons: "Sleep" and "Wake". The wake button is
 * always present (the user wanted an explicit wake control), and the sleep
 * button is disabled while the Mac is already asleep.
 */
export function PowerRingButton({ node }: { node: Node }) {
  const { t } = useI18n();
  const { status: reach, reportSleep, reportAwake } = useReachability();
  const { queue, queued } = useCommand();

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sleeping = reach === "sleeping";
  const online = reach === "online";

  const handleSleep = async () => {
    setConfirming(false);
    setError(null);
    try {
      await queue({ nodeId: node.id, target: "power", action: "sleep" });
      reportSleep();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleWake = async () => {
    setError(null);
    try {
      // Ask the backend to wake the display (caffeinate); the host stays reachable.
      await queue({ nodeId: node.id, target: "power", action: "wake" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    reportAwake();
  };

  return (
    <div className="flex items-start gap-3">
      <RoundButton
        label={t("power.sleep", "Sleep")}
        onClick={() => setConfirming(true)}
        disabled={!online}
      >
        <Moon className="h-6 w-6" aria-hidden="true" />
      </RoundButton>

      <RoundButton
        label={t("power.wake", "Wake")}
        onClick={handleWake}
        accent
        pulsing={sleeping}
      >
        <Sun className="h-6 w-6" aria-hidden="true" />
      </RoundButton>

      {error && <span className="self-center text-[11px] text-error">{error}</span>}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("power.sleep", "Sleep")}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border-soft bg-surface p-5 shadow-xl">
            <h3 className="text-[15px] font-semibold text-text-primary">
              {t("power.confirmTitle", "Sleep {name}?", { name: node.name })}
            </h3>
            <p className="mt-2 text-[13px] leading-snug text-text-secondary">
              {t(
                "power.confirmBody",
                "The Mac will enter sleep. Active tasks may be paused.",
              )}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button variant="danger" size="sm" onClick={handleSleep} disabled={queued}>
                <Moon className="h-4 w-4" aria-hidden="true" />
                {t("power.sleep", "Sleep")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}