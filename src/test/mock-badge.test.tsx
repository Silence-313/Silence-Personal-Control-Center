import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DemoBadge } from "@/components/navigation/DemoBadge";
import { MockDataBadge } from "@/components/ui/MockDataBadge";
import { I18nProvider } from "@/lib/i18n";

describe("MockDataBadge", () => {
  it("renders a demo marker for a mock-only domain", () => {
    render(
      <I18nProvider>
        <MockDataBadge domain="robotics" />
      </I18nProvider>,
    );
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });
});

describe("DemoBadge", () => {
  it("renders the global demo pill in mock mode (tests default to mock)", () => {
    render(
      <I18nProvider>
        <DemoBadge />
      </I18nProvider>,
    );
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
  });
});