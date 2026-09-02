"use client";

import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ReachabilityProvider } from "@/lib/reachability";
import { RealtimeProvider } from "@/lib/realtime";
import { PairingGate } from "@/components/auth/PairingGate";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomTabs } from "@/components/navigation/BottomTabs";
import { MobileTopBar } from "@/components/navigation/MobileTopBar";

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "checking") return null;
  if (status === "unauthorized") return <PairingGate />;
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ReachabilityProvider>
          <Gate>
            <RealtimeProvider>
              <ShellFrame>{children}</ShellFrame>
            </RealtimeProvider>
          </Gate>
        </ReachabilityProvider>
      </AuthProvider>
    </I18nProvider>
  );
}