import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectList } from "@/components/project/ProjectList";
import { I18nProvider } from "@/lib/i18n";
import type { Project } from "@/types";

const project: Project = {
  id: "p1",
  name: "Second Brain",
  nodeId: "macbook-pro",
  repositoryPath: "~/Projects/Second_Brain",
  repositoryType: "git",
  branch: "main",
  health: "healthy",
  workingTree: "clean",
  lastCommitHash: "a1b2c3d",
  lastCommitSubject: "feat: init",
  lastCommitTime: new Date(Date.now() - 90 * 60_000).toISOString(),
};

function renderList(projects: Project[]) {
  return render(
    <I18nProvider>
      <ProjectList projects={projects} />
    </I18nProvider>,
  );
}

describe("ProjectList", () => {
  it("shows name, branch and a working-tree badge", () => {
    renderList([project]);
    expect(screen.getByText("Second Brain")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("Clean")).toBeInTheDocument();
  });

  it("renders a relative last-commit age", () => {
    renderList([project]);
    expect(screen.getByText(/ago$/)).toBeInTheDocument();
  });
});