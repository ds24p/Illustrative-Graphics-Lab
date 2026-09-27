import { describe, expect, it } from "vitest";
import { getAvgIntensity } from "./localAverage";
import type { IntensityImage } from "./types";

const image: IntensityImage = {
  width: 4,
  height: 3,
  values: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
};

describe("Placement local average", () => {
  it("uses exclusive upper bounds for an interior rectangle", () => {
    expect(getAvgIntensity(image, 1, 1, 3, 3)).toBe(8.5);
    expect(getAvgIntensity(image, 0, 0, 1, 1)).toBe(1);
  });

  it.each([
    ["left", -2, 1, 2, 3, 7.5],
    ["right", 3, 1, 6, 3, 10],
    ["top", 1, -2, 3, 1, 2.5],
    ["bottom", 1, 2, 3, 6, 10.5],
    ["corner", -2, -2, 2, 2, 3.5],
  ] as const)("clips the %s edge", (_edge, x1, y1, x2, y2, expected) => {
    expect(getAvgIntensity(image, x1, y1, x2, y2)).toBe(expected);
  });

  it("rejects a zero-area window instead of propagating NaN", () => {
    expect(() => getAvgIntensity(image, 1, 1, 1, 2)).toThrow(/at least one pixel/);
  });
});
