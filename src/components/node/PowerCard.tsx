"use client";

import { useState } from "react";
import { Battery, Moon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCommand, usePower } from "@/hooks";
import { nodeStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import { useReachability } from "@/lib/reachability";
import type { Node } from "@/types";

export function PowerCard({ node }: { node: Node }) {
  const { queue, queued } = useCommand();
  const { data: power } = usePower(node.id);
  const { t } = useI18n();
  const { reportSleep, status: reachStatus } = useReachability();

  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sleeping = reachStatus === "sleeping";
  const offline = reachStatus === "offline";
  const status = nodeStatus(sleeping ? "sleeping" : offline ? "offline" : node.status);
  const awake = !sleeping && !offline && node.status === "online";

  const handleConfirmSleep = async () => {
    setConfirming(false);
    try {
      const command = await queue({ nodeId: node.id, target: "power", action: "sleep" });
      reportSleep();
      setMessage(
        t("power.sleepRequested", "Sleep requested · {id} · {status}", {
          id: command.commandId,
          status: command.status,
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(t("power.sleepFailed", "Sleep command failed: {msg}", { msg }));
    }
  };

  return (
    <>
      <Card className="flex h-full flex-col p-4">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          {t("section.power", "Power")}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusBadge tone={status.tone} pulsing={awake}>
            {awake ? t("power.awake", "Awake") : t(`status.${status.key}`, status.label)}
          </StatusBadge>
          {power && typeof power.battery === "number" && (
            <span className="inline-flex items-center gap-1 text-[12px] text-text-secondary">
              <Battery className="h-3.5 w-3.5" aria-hidden="true" />
              {t("power.battery", "{battery}%", { battery: power.battery })}
              {power.charging
                ? ` · ${t("power.charging", "Charging")}`
                : ` · ${t("power.onBattery", "On battery")}`}
            </span>
          )}
        </div>

        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={!awake}
            className="w-full"
          >
            <Moon className="h-4 w-4" aria-hidden="true" />
            {t("power.sleep", "Sleep")}
          </Button>
          <p className="mt-2 text-[11px] leading-snug text-text-muted">
            {t(
              "power.realNote",
              "Requests real macOS sleep through the authenticated API.",
            )}
          </p>
          {message && (
            <p
              className="mt-2 rounded-control border border-border-soft bg-surface-2 px-2 py-1.5 text-[12px] text-info"
              role="status"
            >
              {message}
            </p>
          )}
        </div>
      </Card>

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
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmSleep}
                disabled={queued}
              >
                <Moon className="h-4 w-4" aria-hidden="true" />
                {t("power.sleep", "Sleep")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}