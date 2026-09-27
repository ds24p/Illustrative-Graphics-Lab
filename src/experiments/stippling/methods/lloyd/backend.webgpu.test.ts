import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageSource } from "../../../../core/images/types";
import { runExperiment } from "../../../../core/execution/runExperiment";
import { getExperimentMethod, getMethodSupportedBackends } from "../../../../core/experiments/methods";
import { stipplingExperiment } from "../../experiment";
import { lloydCpuBackend } from "./backend.cpu";
import { lloydWebGpuBackend } from "./backend.webgpu";
import { ownershipRasterFromIndices } from "./debug";
import { NO_OWNER } from "./ownership";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function source(): ImageSource {
  return {
    id: "black", name: "black", previewUrl: "",
    imageData: {
      width: 7, height: 4,
      data: new Uint8ClampedArray(Array.from({ length: 28 }, () => [0, 0, 0, 255]).flat()),
    } as ImageData,
  };
}

const parameters = {
  ...stipplingExperiment.defaultParameters,
  initialPoints: 3, maxAttempts: 100, iterations: 0,
  lloydMode: "weighted" as const, removeNearWhite: true,
};

describe("Sampled Lloyd WebGPU integration", () => {
  it("keeps zero-iteration initialized points exactly, without needing GPU dispatch", async () => {
    const input = { source: source(), methodId: "lloyd", parameters, debugEnabled: false };
    const cpu = await lloydCpuBackend.run(input);
    const gpu = await lloydWebGpuBackend.run(input);
    expect(gpu.output).toEqual(cpu.output);
    expect(gpu.stageTimings?.["GPU completion (all passes and copies)"]).toBe(0);
  });

  it("offers WebGPU only for the two sampled modes", () => {
    const method = getExperimentMethod(stipplingExperiment, "lloyd");
    expect(getMethodSupportedBackends(method, { ...parameters, lloydMode: "unweighted" }))
      .toEqual(["cpu", "worker", "webgpu"]);
    expect(getMethodSupportedBackends(method, { ...parameters, lloydMode: "weighted" }))
      .toEqual(["cpu", "worker", "webgpu"]);
    expect(getMethodSupportedBackends(method, { ...parameters, lloydMode: "historical-cone" }))
      .toEqual(["cpu"]);
  });

  it("falls back to the same sampled CPU method when WebGPU is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const report = await runExperiment(stipplingExperiment, "lloyd", source(), parameters, "webgpu");
    expect(report.requestedBackend).toBe("webgpu");
    expect(report.usedBackend).toBe("cpu");
    expect(report.fallbackReason).toMatch(/WebGPU/i);
    expect(report.output.kind).toBe("points");
  });

  it("falls back to sampled CPU after a WebGPU runtime failure", async () => {
    const device = { lost: new Promise(() => {}) };
    const adapter = { requestDevice: vi.fn().mockResolvedValue(device) };
    vi.stubGlobal("navigator", { gpu: { requestAdapter: vi.fn().mockResolvedValue(adapter) } });
    vi.spyOn(lloydWebGpuBackend, "run").mockRejectedValue(new Error("GPU reset"));

    const report = await runExperiment(stipplingExperiment, "lloyd", source(), parameters, "webgpu");
    const reference = await lloydCpuBackend.run({
      source: source(), methodId: "lloyd", parameters, debugEnabled: false,
    });
    expect(report.usedBackend).toBe("cpu");
    expect(report.fallbackReason).toContain("GPU reset");
    expect(report.output).toEqual(reference.output);
  });

  it("renders GPU ownership indices into the same 3 px debug cells", () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const raster = ownershipRasterFromIndices(new Uint32Array([0, 1, NO_OWNER, 1, 0, 1]), 2, 7, 4);
    expect(raster.imageData.data[3]).toBe(255);
    expect(raster.imageData.data[(0 * 7 + 6) * 4]).toBe(255);
    expect(raster.imageData.data.slice(0, 3)).not.toEqual(raster.imageData.data.slice(3 * 4, 3 * 4 + 3));
  });
});
