import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { RuntimeBadge } from "@/components/research/RuntimeBadge";
import { I18nProvider } from "@/lib/i18n";
import type { ResearchRuntime } from "@/types";

function renderBadge(runtime?: ResearchRuntime | null) {
  return render(
    <I18nProvider>
      <RuntimeBadge runtime={runtime} />
    </I18nProvider>,
  );
}

describe("RuntimeBadge", () => {
  it("shows exists for an on-disk path", () => {
    renderBadge({ exists: true, missing: false, sizeBytes: 10 });
    expect(screen.getByText("On disk")).toBeInTheDocument();
  });

  it("shows missing for absent or undefined paths", () => {
    renderBadge({ exists: false, missing: true });
    expect(screen.getByText("Missing")).toBeInTheDocument();
    renderBadge(undefined);
    expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
  });

  it("shows error when observation failed", () => {
    renderBadge({ exists: false, missing: false, error: "permission denied" });
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("shows stale for an old modified date", () => {
    renderBadge({
      exists: true,
      missing: false,
      modifiedAt: "2026-01-01T00:00:00Z",
    });
    expect(screen.getByText("Stale")).toBeInTheDocument();
  });

  it("shows exists for a recent modified date", () => {
    renderBadge({
      exists: true,
      missing: false,
      modifiedAt: new Date().toISOString(),
    });
    expect(screen.getByText("On disk")).toBeInTheDocument();
  });
});