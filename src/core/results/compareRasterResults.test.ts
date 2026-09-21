import { describe, expect, it } from "vitest";
import { compareRasterResults } from "./compareRasterResults";
import type { RasterResult } from "./types";

function raster(width: number, height: number, data: number[]): RasterResult {
  return {
    kind: "raster",
    imageData: {
      width,
      height,
      data: new Uint8ClampedArray(data),
    } as ImageData,
  };
}

describe("raster result comparison", () => {
  it("reports identical pixels exactly", () => {
    const result = raster(1, 1, [255, 255, 255, 255]);
    expect(compareRasterResults(result, result)).toEqual({
      differentPixels: 0,
      maximumChannelDifference: 0,
      totalPixels: 1,
    });
  });

  it("counts pixels once and keeps the largest channel difference", () => {
    const first = raster(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]);
    const second = raster(2, 1, [0, 10, 0, 255, 250, 255, 255, 255]);
    expect(compareRasterResults(first, second)).toEqual({
      differentPixels: 2,
      maximumChannelDifference: 10,
      totalPixels: 2,
    });
  });

  it("rejects mismatched dimensions", () => {
    expect(() =>
      compareRasterResults(
        raster(1, 1, [0, 0, 0, 255]),
        raster(2, 1, [0, 0, 0, 255, 0, 0, 0, 255]),
      ),
    ).toThrow("different dimensions");
  });
});
