import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageSource } from "../../../../core/images/types";
import { runExperiment } from "../../../../core/execution/runExperiment";
import { stipplingExperiment } from "../../experiment";
import { lloydCpuBackend } from "./backend.cpu";
import { ownershipRaster } from "./debug";
import { createProcessingIntensity } from "../../intensity";
import { relaxHistoricalLloyd } from "./historical/algorithm.cpu";
import { lloydParameters } from "../../parameters";

afterEach(() => vi.unstubAllGlobals());

function source(): ImageSource {
  return {
    id: "black-test",
    name: "black-test",
    previewUrl: "",
    imageData: {
      width: 7,
      height: 4,
      data: new Uint8ClampedArray(Array.from({ length: 28 }, () => [0, 0, 0, 255]).flat()),
    } as ImageData,
  };
}

const parameters = {
  ...stipplingExperiment.defaultParameters,
  initialPoints: 3,
  maxAttempts: 10,
  iterations: 2,
  lloydMode: "weighted" as const,
};

describe("Voronoi / Lloyd CPU backend", () => {
  it("reports initial and final counts and converts diameter to PointResult radius", async () => {
    const report = await runExperiment(
      stipplingExperiment, "lloyd", source(), { ...parameters, dotSize: 4 }, "cpu",
    );
    expect(report.output.kind).toBe("points");
    if (report.output.kind !== "points") throw new Error("Expected PointResult.");
    expect(report.output.points).toHaveLength(3);
    expect(report.output.points.every((point) => point.radius === 2)).toBe(true);
    expect(report.statistics).toContainEqual({ label: "Initial points accepted", value: "3" });
    expect(report.statistics).toContainEqual({ label: "Iterations", value: "2" });
    expect(report.statistics).toContainEqual({ label: "Mode", value: "Darkness-weighted" });
  });

  it("does not let Dot Size or debug alter final coordinates", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = { source: source(), methodId: "lloyd", parameters };
    const small = await lloydCpuBackend.run({ ...input, parameters: { ...parameters, dotSize: 2 }, debugEnabled: false });
    const large = await lloydCpuBackend.run({ ...input, parameters: { ...parameters, dotSize: 8 }, debugEnabled: true });
    expect(small.output.kind).toBe("points");
    expect(large.output.kind).toBe("points");
    if (small.output.kind !== "points" || large.output.kind !== "points") return;
    expect(small.output.points.map(({ x, y }) => [x, y]))
      .toEqual(large.output.points.map(({ x, y }) => [x, y]));
    expect(small.statistics).toEqual(large.statistics);
    expect(small.output.points[0].radius).toBe(1);
    expect(large.output.points[0].radius).toBe(4);
    expect(small.debugViews).toBeUndefined();
    expect(large.debugViews?.map(({ id }) => id)).toEqual([
      "original", "processing-brightness", "darkness-weight", "initial-points",
      "voronoi-ownership", "before-final-iteration", "after-final-iteration", "final-stipples",
    ]);
  });

  it("colors ownership deterministically using 3 px cells and the reference nearest-site rule", () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const points = [{ x: 0, y: 0 }, { x: 5, y: 0 }];
    const first = ownershipRaster(points, 6, 3).imageData.data;
    const second = ownershipRaster(points, 6, 3).imageData.data;
    expect(first).toEqual(second);
    expect(Array.from(first.slice(0, 3))).toEqual(Array.from(first.slice(4, 7)));
    expect(Array.from(first.slice(0, 3))).not.toEqual(Array.from(first.slice(12, 15)));
    expect(first[3]).toBe(255);
  });

  it("offers only the three valid ownership and weighting combinations", () => {
    const mode = lloydParameters.find((parameter) => parameter.key === "lloydMode");
    expect(mode?.kind).toBe("select");
    if (mode?.kind !== "select") return;
    expect(mode.options.map(({ value }) => value)).toEqual([
      "unweighted", "weighted", "historical-cone",
    ]);
  });

  it("uses historical cone ownership with the actual encoded last-pass map", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = {
      source: source(), methodId: "lloyd",
      parameters: { ...parameters, lloydMode: "historical-cone" as const },
    };
    const plain = await lloydCpuBackend.run({ ...input, debugEnabled: false });
    const debug = await lloydCpuBackend.run({ ...input, debugEnabled: true });
    expect(debug.output).toEqual(plain.output);
    expect(debug.statistics).toEqual(plain.statistics);
    expect(plain.debugViews).toBeUndefined();
    expect(debug.debugViews?.map(({ id }) => id)).toEqual([
      "original", "processing-brightness", "darkness-weight", "initial-points",
      "encoded-ownership", "decoded-ownership", "before-final-iteration",
      "after-final-iteration", "final-stipples",
    ]);
    expect(debug.statistics).toContainEqual({ label: "Ownership strategy", value: "Historical Cone Rasterization" });
    const computed = relaxHistoricalLloyd(createProcessingIntensity(input.source.imageData), input.parameters);
    const encoded = debug.debugViews?.find(({ id }) => id === "encoded-ownership");
    expect(encoded?.result.kind).toBe("raster");
    if (encoded?.result.kind !== "raster") return;
    for (let pixel = 0; pixel < computed.ownership!.encodedRgb.length; pixel += 1) {
      const color = computed.ownership!.encodedRgb[pixel];
      expect(Array.from(encoded.result.imageData.data.slice(pixel * 4, pixel * 4 + 4)))
        .toEqual([(color >> 16) & 255, (color >> 8) & 255, color & 255, 255]);
    }
  });

  it("keeps historical sites and stats independent of visible Dot Size", async () => {
    const input = { source: source(), methodId: "lloyd", debugEnabled: false };
    const small = await lloydCpuBackend.run({
      ...input, parameters: { ...parameters, lloydMode: "historical-cone", dotSize: 2 },
    });
    const large = await lloydCpuBackend.run({
      ...input, parameters: { ...parameters, lloydMode: "historical-cone", dotSize: 8 },
    });
    if (small.output.kind !== "points" || large.output.kind !== "points") throw new Error("Expected PointResult.");
    expect(small.output.points.map(({ x, y }) => [x, y]))
      .toEqual(large.output.points.map(({ x, y }) => [x, y]));
    expect(small.statistics).toEqual(large.statistics);
    expect(small.output.points[0]?.radius).toBe(1);
    expect(large.output.points[0]?.radius).toBe(4);
  });
});
