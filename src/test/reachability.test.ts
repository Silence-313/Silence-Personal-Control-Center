import { afterEach, describe, expect, it, vi } from "vitest";

import { classifyHealth, probe } from "@/lib/reachability";

describe("classifyHealth", () => {
  it("online when the display is on", () => {
    expect(classifyHealth(true)).toBe("online");
  });

  it("sleeping when the display is off", () => {
    expect(classifyHealth(false)).toBe("sleeping");
  });

  it("assumes online when display state is missing", () => {
    expect(classifyHealth(undefined)).toBe("online");
  });
});

describe("probe (online / sleeping / offline decision)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubHealth(status: number, displayOn?: boolean) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: status < 400,
        json: async () => ({ display_on: displayOn }),
      }),
    );
  }

  it("online when /health is reachable and display is on", async () => {
    stubHealth(200, true);
    await expect(probe()).resolves.toBe("online");
  });

  it("sleeping when /health is reachable and display is off", async () => {
    stubHealth(200, false);
    await expect(probe()).resolves.toBe("sleeping");
  });

  it("offline when /health is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(probe()).resolves.toBe("offline");
  });

  it("offline on a non-2xx /health response", async () => {
    stubHealth(500);
    await expect(probe()).resolves.toBe("offline");
  });
});