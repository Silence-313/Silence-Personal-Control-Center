"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearAccessToken, getAccessToken } from "@/lib/device";

type AuthStatus = "checking" | "authorized" | "unauthorized";

interface AuthContextValue {
  status: AuthStatus;
  /** Transition to authorized after a device completes pairing. */
  authorize: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    setStatus(getAccessToken() ? "authorized" : "unauthorized");

    // A 401 from the API (invalid/revoked device token) forces re-pairing.
    const onUnauthorized = () => {
      clearAccessToken();
      setStatus("unauthorized");
    };
    window.addEventListener("silence:unauthorized", onUnauthorized);
    return () => window.removeEventListener("silence:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({ status, authorize: () => setStatus("authorized") }),
    [status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}