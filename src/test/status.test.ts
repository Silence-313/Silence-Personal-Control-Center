import { describe, expect, it } from "vitest";

import { nodeStatus } from "@/lib/status";

describe("nodeStatus tone mapping", () => {
  it("online → success", () => {
    expect(nodeStatus("online").tone).toBe("success");
  });

  it("sleeping → neutral", () => {
    expect(nodeStatus("sleeping").tone).toBe("neutral");
  });

  it("offline → error", () => {
    expect(nodeStatus("offline").tone).toBe("error");
  });

  it("unknown → neutral", () => {
    expect(nodeStatus("unknown").tone).toBe("neutral");
  });

  it("title-cases the display label", () => {
    expect(nodeStatus("online").label).toBe("Online");
  });
});