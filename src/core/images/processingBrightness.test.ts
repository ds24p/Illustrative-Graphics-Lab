import { describe, expect, it } from "vitest";
import { processingBrightness } from "./processingBrightness";
import { createProcessingIntensity as ditherIntensity } from "../../experiments/dithering/intensity";
import { createProcessingIntensity as screeningIntensity } from "../../experiments/screening/intensity";

describe("shared Processing brightness", () => {
  it.each([
    [0, 0, 0, 0],
    [255, 255, 255, 1],
    [255, 0, 0, 1],
    [0, 255, 0, 1],
    [0, 0, 255, 1],
    [20, 128, 60, 128 / 255],
  ])("converts RGB (%i, %i, %i)", (red, green, blue, expected) => {
    expect(processingBrightness(red, green, blue)).toBe(expected);
  });

  it("preserves Dithering and Screening intensity conversion", () => {
    const image = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([20, 128, 60, 255, 0, 0, 255, 255]),
    } as ImageData;
    expect(Array.from(ditherIntensity(image).values)).toEqual([
      Math.fround(128 / 255),
      1,
    ]);
    expect(screeningIntensity(image).values).toEqual(ditherIntensity(image).values);
  });
});
