"use client";

import { useState } from "react";
import { Loader2, RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { API_BASE } from "@/lib/api-base";
import { useAuth } from "@/lib/auth";
import { deviceLabel, getDeviceCode, setAccessToken } from "@/lib/device";
import { useI18n } from "@/lib/i18n";

export function PairingGate() {
  const { authorize } = useAuth();
  const { t } = useI18n();

  const [deviceCode] = useState(() => getDeviceCode());
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [dismissed, setDismissed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPairing = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode, label: deviceLabel() }),
      });
      if (!res.ok) throw new Error(`pair failed (${res.status})`);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode, verification_code: code }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message ?? `verify failed (${res.status})`);
      }
      setAccessToken(body.access_token);
      authorize();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (dismissed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <p className="text-[14px] text-text-secondary">
          {t("pair.notConnected", "Not connected")}
        </p>
        <Button variant="secondary" size="sm" onClick={() => setDismissed(false)}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("pair.retry", "Reconnect")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border-soft bg-surface p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-text-primary">
            {t("pair.title", "Connect to this Mac?")}
          </h2>
        </div>

        <div className="mt-3 rounded-control bg-surface-2 px-3 py-2 text-[12px] text-text-secondary">
          <div>
            {t("pair.deviceCode", "Device code")}:{" "}
            <span className="font-mono text-text-primary">{deviceCode}</span>
          </div>
          <div className="mt-1">{deviceLabel()}</div>
        </div>

        {step === "intro" ? (
          <div className="mt-4 space-y-3">
            <p className="text-[13px] leading-snug text-text-secondary">
              {t(
                "pair.introBody",
                "First-time connection requires a one-time code shown on the Mac.",
              )}
            </p>
            <Button onClick={startPairing} disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("pair.connect", "Connect")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="w-full"
            >
              {t("pair.cancel", "Cancel")}
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-[13px] text-text-secondary">
              {t("pair.codePrompt", "Enter the 6-digit code shown on the Mac:")}
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="· · · · · ·"
              aria-label={t("pair.codePrompt", "Verification code")}
              className="w-full rounded-control border border-border-strong bg-background px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-text-primary outline-none focus:border-accent"
            />
            <Button onClick={verify} disabled={busy || code.length !== 6} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("pair.verify", "Verify")}
            </Button>
            <button
              onClick={() => setStep("intro")}
              disabled={busy}
              className="w-full text-[12px] text-text-muted hover:text-text-primary"
            >
              {t("common.back", "Back")}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-[12px] text-error">{error}</p>}
      </div>
    </div>
  );
}