"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { API_BASE } from "@/lib/api-base";

export type ReachabilityStatus =
  | "checking"
  | "online"
  | "sleeping"
  | "offline";

/** Ground-truth display state → reachability status (backend reachable). */
export function classifyHealth(displayOn: boolean | undefined): "online" | "sleeping" {
  return displayOn === false ? "sleeping" : "online";
}

interface ReachabilityContextValue {
  status: ReachabilityStatus;
  /** Flip to "sleeping" immediately (called right after a screen-sleep command). */
  reportSleep: () => void;
  /** Flip to "online" explicitly (called after waking the display). */
  reportAwake: () => void;
}

const POLL_MS = 3000;
const TIMEOUT_MS = 2500;

const ReachabilityContext = createContext<ReachabilityContextValue | null>(null);

/**
 * The Mac now uses "screen sleep" (display off, host still up), so the ground
 * truth for "sleeping" is the display state reported by the backend — not
 * whether HTTP succeeds. An unreachable backend is "offline" (NOT sleeping).
 */
export async function probe(): Promise<Exclude<ReachabilityStatus, "checking">> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return "offline";
    const data = (await res.json()) as { display_on?: boolean };
    return classifyHealth(data.display_on);
  } catch {
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}

export function ReachabilityProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ReachabilityStatus>("checking");
  const statusRef = useRef<ReachabilityStatus>("checking");

  const apply = useCallback((next: ReachabilityStatus, fireWake: boolean) => {
    statusRef.current = next;
    setStatus(next);
    if (fireWake && next === "online") {
      try {
        window.dispatchEvent(new CustomEvent("silence:wake"));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const reportSleep = useCallback(() => {
    apply("sleeping", false);
  }, [apply]);

  const reportAwake = useCallback(() => {
    apply("online", true);
  }, [apply]);

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      const observed = await probe();
      inFlight = false;
      if (!alive) return;

      if (observed !== statusRef.current) {
        apply(observed, observed === "online");
      }
    }

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    // Re-probe right away when the tab becomes visible again (iOS suspends
    // timers while locked / backgrounded).
    const poke = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", poke);
    window.addEventListener("focus", poke);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", poke);
      window.removeEventListener("focus", poke);
    };
  }, [apply]);

  const value = useMemo(
    () => ({ status, reportSleep, reportAwake }),
    [status, reportSleep, reportAwake],
  );
  return (
    <ReachabilityContext.Provider value={value}>{children}</ReachabilityContext.Provider>
  );
}

export function useReachability(): ReachabilityContextValue {
  const ctx = useContext(ReachabilityContext);
  if (!ctx) throw new Error("useReachability must be used within ReachabilityProvider");
  return ctx;
}