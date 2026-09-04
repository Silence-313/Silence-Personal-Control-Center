import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/link", () => {
  const MockLink = (props: Record<string, unknown>) => {
    const { href, children, ...rest } = props;
    return (
      <a href={href as string} {...rest}>
        {children as React.ReactNode}
      </a>
    );
  };
  return { default: MockLink };
});

import { KnowledgeList } from "@/components/knowledge/KnowledgeList";
import { I18nProvider } from "@/lib/i18n";
import type { KnowledgeItem } from "@/types";

const paper: KnowledgeItem = {
  id: "paper:paper-gvhmr",
  entityId: "paper-gvhmr",
  type: "paper",
  title: "Generalizable Human Motion Reconstruction",
  summary: "Human motion capture",
  tags: ["HMR", "pose"],
  metadata: {},
  createdAt: "2026-08-06T10:00:00Z",
  updatedAt: "2026-09-03T10:00:00Z",
};

const dataset: KnowledgeItem = {
  id: "dataset:ds-mocap",
  entityId: "ds-mocap",
  type: "dataset",
  title: "Humanoid Motion Capture Clips",
  summary: "MoCap clips",
  tags: ["motion"],
  metadata: {},
  createdAt: "2026-08-06T10:00:00Z",
  updatedAt: "2026-09-03T10:00:00Z",
};

function renderList(items: KnowledgeItem[]) {
  return render(
    <I18nProvider>
      <KnowledgeList items={items} />
    </I18nProvider>,
  );
}

describe("KnowledgeList", () => {
  it("renders item title, type badge and detail link", () => {
    renderList([paper]);
    expect(screen.getByText("Generalizable Human Motion Reconstruction")).toBeInTheDocument();
    const link = screen.getByText("Generalizable Human Motion Reconstruction").closest("a");
    expect(link).toHaveTextContent("Paper");
    expect(link).toHaveAttribute("href", "/context/paper/paper-gvhmr");
  });

  it("filters by search query", () => {
    renderList([paper, dataset]);
    const input = screen.getByPlaceholderText("Search knowledge…");
    fireEvent.change(input, { target: { value: "mocap" } });
    expect(screen.getByText("Humanoid Motion Capture Clips")).toBeInTheDocument();
    expect(screen.queryByText("Generalizable Human Motion Reconstruction")).not.toBeInTheDocument();
  });

  it("filters by type", () => {
    renderList([paper, dataset]);
    const select = screen.getByLabelText("Filter by type");
    fireEvent.change(select, { target: { value: "paper" } });
    expect(screen.getByText("Generalizable Human Motion Reconstruction")).toBeInTheDocument();
    expect(screen.queryByText("Humanoid Motion Capture Clips")).not.toBeInTheDocument();
  });
});