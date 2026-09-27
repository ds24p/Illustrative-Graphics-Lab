import { describe, expect, it } from "vitest";
import { compareBackendOutputs } from "./compareBackends";

describe("backend result comparison", () => {
  it("compares ordered point positions without treating them as pixels", () => {
    const first = { kind: "points" as const, width: 10, height: 10, points: [{ x: 0, y: 0 }] };
    const second = { kind: "points" as const, width: 10, height: 10, points: [{ x: 3, y: 4 }] };
    expect(compareBackendOutputs(first, second)).toEqual({
      kind: "points",
      data: { firstCount: 1, secondCount: 1, pairedCount: 1,
        meanDisplacement: 5, maximumDisplacement: 5, maximumIndex: 0 },
    });
  });

  it("keeps raster comparison unchanged", () => {
    const first = { kind: "raster" as const, imageData: { width: 1, height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 255]) } as ImageData };
    const second = { kind: "raster" as const, imageData: { width: 1, height: 1,
      data: new Uint8ClampedArray([1, 0, 0, 255]) } as ImageData };
    expect(compareBackendOutputs(first, second)).toEqual({
      kind: "raster", data: { differentPixels: 1, maximumChannelDifference: 1, totalPixels: 1 },
    });
  });
});
