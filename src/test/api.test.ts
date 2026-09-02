import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

/**
 * Guards the mock/real seam: in mock mode (the Vitest default) sleep/wake must
 * return a queued command WITHOUT ever touching the network, so no real
 * `pmset`/`caffeinate` can run from a test.
 */
describe("sendCommand mock/real seam", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sleep is queued without any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const cmd = await api.sendCommand({
      nodeId: "macbook-pro",
      target: "power",
      action: "sleep",
    });

    expect(cmd.action).toBe("sleep");
    expect(cmd.status).toBe("queued");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wake is queued without any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const cmd = await api.sendCommand({
      nodeId: "macbook-pro",
      target: "power",
      action: "wake",
    });

    expect(cmd.action).toBe("wake");
    expect(cmd.status).toBe("queued");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});