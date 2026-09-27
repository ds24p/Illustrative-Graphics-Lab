import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("Sampled Lloyd ownership prototype availability", () => {
  it("fails cleanly when WebGPU is absent", async () => {
    vi.stubGlobal("navigator", {});
    const { computeSampledOwnershipWebGpu } = await import("./ownership.webgpu");

    await expect(computeSampledOwnershipWebGpu([], 7, 4))
      .rejects.toThrow("No compatible WebGPU adapter was found.");
  });

  it("fails cleanly when no adapter is returned", async () => {
    vi.stubGlobal("navigator", {
      gpu: { requestAdapter: vi.fn().mockResolvedValue(null) },
    });
    const { computeSampledOwnershipWebGpu } = await import("./ownership.webgpu");

    await expect(computeSampledOwnershipWebGpu([{ x: 0, y: 0 }], 7, 4))
      .rejects.toThrow("No compatible WebGPU adapter was found.");
  });
});
