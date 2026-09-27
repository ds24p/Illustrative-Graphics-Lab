import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageSource } from "../../../../core/images/types";
import { runExperiment } from "../../../../core/execution/runExperiment";
import { stipplingExperiment } from "../../experiment";
import { poissonCpuBackend } from "./backend.cpu";

afterEach(() => vi.unstubAllGlobals());

function source(): ImageSource {
  return {
    id: "black-test",
    name: "black-test",
    previewUrl: "",
    imageData: {
      width: 20,
      height: 1,
      data: new Uint8ClampedArray(Array.from({ length: 20 }, () => [0, 0, 0, 255]).flat()),
    } as ImageData,
  };
}

describe("Poisson-Disc CPU backend", () => {
  const parameters = {
    ...stipplingExperiment.defaultParameters,
    targetPoints: 2,
    maxAttempts: 10,
    poissonRadius: 1,
  };

  it("renders Dot Size rather than exclusion radius and reports statistics", async () => {
    const run = await runExperiment(
      stipplingExperiment,
      "poisson",
      source(),
      { ...parameters, dotSize: 2, spacingMode: "uniform" },
      "cpu",
    );
    expect(run.output.kind).toBe("points");
    if (run.output.kind !== "points") throw new Error("Expected point output.");
    expect(run.output.points).toHaveLength(2);
    expect(run.output.points.every((point) => point.radius === 1)).toBe(true);
    expect(run.statistics?.find(({ label }) => label === "Spacing mode"))
      .toEqual({ label: "Spacing mode", value: "Uniform" });
    expect(run.statistics?.find(({ label }) => label === "Spacing check"))
      .toEqual({ label: "Spacing check", value: "Exact Distance" });
  });

  it("does not let Dot Size change the algorithmic point sequence", async () => {
    const small = await poissonCpuBackend.run({
      source: source(), parameters: { ...parameters, dotSize: 2 }, methodId: "poisson", debugEnabled: false,
    });
    const large = await poissonCpuBackend.run({
      source: source(), parameters: { ...parameters, dotSize: 8 }, methodId: "poisson", debugEnabled: false,
    });
    expect(small.output.kind).toBe("points");
    expect(large.output.kind).toBe("points");
    if (small.output.kind !== "points" || large.output.kind !== "points") return;
    expect(small.output.points.map(({ x, y }) => [x, y]))
      .toEqual(large.output.points.map(({ x, y }) => [x, y]));
    expect(small.statistics).toEqual(large.statistics);
    expect(small.output.points[0].radius).toBe(1);
    expect(large.output.points[0].radius).toBe(4);
  });

  it("does not let debug views change points or statistics", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = { source: source(), parameters, methodId: "poisson" };
    const plain = await poissonCpuBackend.run({ ...input, debugEnabled: false });
    const debug = await poissonCpuBackend.run({ ...input, debugEnabled: true });

    expect(debug.output).toEqual(plain.output);
    expect(debug.statistics).toEqual(plain.statistics);
    expect(plain.debugViews).toBeUndefined();
    expect(debug.debugViews?.map(({ id }) => id)).toEqual([
      "original", "processing-brightness", "spacing-field", "final-stipples",
    ]);
    expect(debug.debugViews?.at(-1)?.result).toBe(debug.output);
  });

  it("shows a constant usable spacing factor in uniform mode and cutoff as white", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = source();
    input.imageData.data.fill(255);
    input.imageData.data.set([0, 0, 0, 255], 0);
    const debug = await poissonCpuBackend.run({
      source: input,
      parameters: { ...parameters, spacingMode: "uniform", maxAttempts: 1 },
      methodId: "poisson",
      debugEnabled: true,
    });
    const spacing = debug.debugViews?.find(({ id }) => id === "spacing-field");
    expect(spacing?.label).toBe("Uniform Spacing Field");
    expect(spacing?.result.kind).toBe("raster");
    if (spacing?.result.kind !== "raster") return;
    expect(spacing.result.imageData.data[0]).toBe(180);
    expect(spacing.result.imageData.data.at(-4)).toBe(255);
  });

  it("keeps historical output and statistics identical with debug on or off", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = {
      source: source(),
      parameters: { ...parameters, spacingCheck: "historical-occupancy" as const },
      methodId: "poisson",
    };
    const plain = await poissonCpuBackend.run({ ...input, debugEnabled: false });
    const debug = await poissonCpuBackend.run({ ...input, debugEnabled: true });
    expect(debug.output).toEqual(plain.output);
    expect(debug.statistics).toEqual(plain.statistics);
    expect(plain.debugViews).toBeUndefined();
    expect(debug.debugViews?.map(({ id }) => id)).toEqual([
      "original", "processing-brightness", "spacing-field", "occupancy-buffer", "centers-over-occupancy", "final-stipples",
    ]);
    const occupancy = debug.debugViews?.find(({ id }) => id === "occupancy-buffer");
    expect(occupancy?.result.kind).toBe("raster");
    if (occupancy?.result.kind !== "raster") return;
    expect(Array.from(occupancy.result.imageData.data).some((value) => value === 0)).toBe(true);
    expect(occupancy.result.imageData.data.at(-1)).toBe(255);
    const centers = debug.debugViews?.find(({ id }) => id === "centers-over-occupancy");
    expect(centers?.result.kind).toBe("raster");
    if (centers?.result.kind !== "raster") return;
    expect(Array.from(centers.result.imageData.data).some((value) => value === 235)).toBe(true);
    expect(Array.from(occupancy.result.imageData.data).some((value) => value === 235)).toBe(false);
  });

  it("keeps historical centers, attempts, and occupancy independent of Dot Size", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = { source: source(), methodId: "poisson", debugEnabled: true };
    const small = await poissonCpuBackend.run({
      ...input, parameters: { ...parameters, spacingCheck: "historical-occupancy", dotSize: 2 },
    });
    const large = await poissonCpuBackend.run({
      ...input, parameters: { ...parameters, spacingCheck: "historical-occupancy", dotSize: 8 },
    });
    if (small.output.kind !== "points" || large.output.kind !== "points") throw new Error("Expected points.");
    expect(small.output.points.map(({ x, y }) => [x, y]))
      .toEqual(large.output.points.map(({ x, y }) => [x, y]));
    expect(small.statistics).toEqual(large.statistics);
    expect(small.debugViews?.find(({ id }) => id === "occupancy-buffer")?.result)
      .toEqual(large.debugViews?.find(({ id }) => id === "occupancy-buffer")?.result);
    expect(small.output.points[0]?.radius).toBe(1);
    expect(large.output.points[0]?.radius).toBe(4);
  });
});
