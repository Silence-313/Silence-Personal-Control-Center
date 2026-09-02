import { describe, expect, it } from "vitest";

import { mapProject } from "@/lib/backend";
import { projectHealth, workingTreeStatus } from "@/lib/status";

function raw(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Proj",
    node_id: "macbook-pro",
    path: "/Users/me/Proj",
    type: "git",
    branch: "main",
    git_status: "clean",
    health: "healthy",
    modified: 0,
    remote: "https://example.com/proj.git",
    ahead: 2,
    behind: 1,
    head: "a".repeat(40),
    last_commit: "a1b2c3d",
    last_commit_subject: "feat: init",
    last_commit_time: "2025-01-01T00:00:00+00:00",
    ...overrides,
  };
}

describe("mapProject (snake_case ProjectOut → Project)", () => {
  it("maps identity, node and repository", () => {
    const p = mapProject(raw());
    expect(p.id).toBe("p1");
    expect(p.name).toBe("Proj");
    expect(p.nodeId).toBe("macbook-pro");
    expect(p.repositoryPath).toBe("/Users/me/Proj");
    expect(p.repositoryType).toBe("git");
  });

  it("maps git metadata (health / working tree / remote / sync / head)", () => {
    const p = mapProject(raw());
    expect(p.health).toBe("healthy");
    expect(p.workingTree).toBe("clean");
    expect(p.remote).toBe("https://example.com/proj.git");
    expect(p.ahead).toBe(2);
    expect(p.behind).toBe(1);
    expect(p.head).toBe("a".repeat(40));
  });

  it("maps last commit fields", () => {
    const p = mapProject(raw());
    expect(p.lastCommitHash).toBe("a1b2c3d");
    expect(p.lastCommitSubject).toBe("feat: init");
    expect(p.lastCommitTime).toBe("2025-01-01T00:00:00+00:00");
  });

  it("marks dirty working tree and diffs", () => {
    const p = mapProject(raw({ git_status: "dirty", health: "dirty", modified: 18 }));
    expect(p.workingTree).toBe("dirty");
    expect(p.health).toBe("dirty");
    expect(p.modified).toBe(18);
  });

  it("normalizes unknown git_status and undefined sync/head", () => {
    const p = mapProject(
      raw({
        git_status: "not_a_repo",
        health: "error",
        remote: null,
        ahead: null,
        behind: null,
        head: null,
        last_commit: null,
        last_commit_subject: null,
        last_commit_time: null,
      }),
    );
    expect(p.workingTree).toBe("unknown");
    expect(p.health).toBe("error");
    expect(p.remote).toBeUndefined();
    expect(p.ahead).toBeUndefined();
    expect(p.behind).toBeUndefined();
    expect(p.head).toBeUndefined();
    expect(p.lastCommitHash).toBe("");
    expect(p.lastCommitSubject).toBe("—");
    expect(p.lastCommitTime).toBeUndefined();
  });

  it("falls back to empty nodeId and exludes zero modified", () => {
    const p = mapProject(raw({ node_id: "", modified: 0 }));
    expect(p.nodeId).toBe("");
    expect(p.modified).toBeUndefined();
  });
});

describe("project status tones", () => {
  it("maps health tones", () => {
    expect(projectHealth("healthy").tone).toBe("success");
    expect(projectHealth("dirty").tone).toBe("warning");
    expect(projectHealth("error").tone).toBe("error");
    expect(projectHealth("unknown").tone).toBe("neutral");
  });

  it("maps working tree tones", () => {
    expect(workingTreeStatus("clean").tone).toBe("success");
    expect(workingTreeStatus("dirty").tone).toBe("warning");
    expect(workingTreeStatus("unknown").tone).toBe("neutral");
  });
});