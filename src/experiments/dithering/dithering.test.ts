import { describe, expect, it } from "vitest";
import { processingBrightness } from "./intensity";
import { coordinateRandom, hashPixelCoordinates } from "./random";
import { ditherFloydSteinberg1D } from "./methods/floyd-steinberg-1d/algorithm.cpu";
import { ditherFloydSteinberg2D } from "./methods/floyd-steinberg-2d/algorithm.cpu";
import {
  createBackwardLine,
  ditherFloydSteinbergLines,
  rasterizeBackwardLine,
} from "./methods/floyd-steinberg-lines/algorithm.cpu";
import { ditherRandomThreshold } from "./methods/random-threshold/algorithm.cpu";
import { ditherThreshold } from "./methods/threshold/algorithm.cpu";
import type { IntensityImage } from "./types";

function intensity(
  width: number,
  height: number,
  values: number[],
): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

function pixels(values: Uint8Array) {
  return Array.from(values);
}

function rasterizedLine(x: number, y: number, length: number) {
  const target = new Uint8Array(16);
  target.fill(1);
  rasterizeBackwardLine(createBackwardLine(x, y, length), target, 4, 4);
  return pixels(target);
}

describe("Processing brightness conversion", () => {
  it("uses the maximum RGB channel rather than perceptual luminance", () => {
    expect(processingBrightness(255, 0, 0)).toBe(1);
    expect(processingBrightness(0, 128, 64)).toBeCloseTo(128 / 255);
  });
});

describe("binary dithering methods", () => {
  it("handles all-white input", () => {
    const source = intensity(1, 1, [1]);
    expect(pixels(ditherThreshold(source, 0.5).image.values)).toEqual([1]);
    expect(
      pixels(ditherRandomThreshold(source, 0.5, 0.5, 42, false).image.values),
    ).toEqual([1]);
    expect(pixels(ditherFloydSteinberg1D(source, false).image.values)).toEqual([1]);
    expect(pixels(ditherFloydSteinberg2D(source, false).image.values)).toEqual([1]);
    expect(pixels(ditherFloydSteinbergLines(source, 3, false).image.values)).toEqual([1]);
  });

  it("handles all-black input", () => {
    const source = intensity(1, 1, [0]);
    expect(pixels(ditherThreshold(source, 0.5).image.values)).toEqual([0]);
    expect(
      pixels(ditherRandomThreshold(source, 0.5, 0.5, 42, false).image.values),
    ).toEqual([0]);
    expect(pixels(ditherFloydSteinberg1D(source, false).image.values)).toEqual([0]);
    expect(pixels(ditherFloydSteinberg2D(source, false).image.values)).toEqual([0]);
    expect(pixels(ditherFloydSteinbergLines(source, 3, false).image.values)).toEqual([0]);
  });

  it("preserves the exact 0.5 comparison difference", () => {
    const source = intensity(1, 1, [0.5]);
    expect(pixels(ditherThreshold(source, 0.5).image.values)).toEqual([1]);
    expect(pixels(ditherFloydSteinberg1D(source, false).image.values)).toEqual([1]);
    expect(pixels(ditherFloydSteinberg2D(source, false).image.values)).toEqual([0]);
    expect(pixels(ditherFloydSteinbergLines(source, 3, false).image.values)).toEqual([1]);
  });

  it("thresholds a simple grayscale gradient", () => {
    const source = intensity(5, 1, [0, 0.25, 0.5, 0.75, 1]);
    expect(pixels(ditherThreshold(source, 0.5).image.values)).toEqual([
      0, 0, 1, 1, 1,
    ]);
  });

  it("propagates the complete 1D error to the next pixel", () => {
    const source = intensity(2, 1, [0.4, 0.4]);
    expect(pixels(ditherFloydSteinberg1D(source, false).image.values)).toEqual([
      0, 1,
    ]);
  });

  it("uses the original weighted 2D propagation stencil", () => {
    const source = intensity(2, 2, [0.4, 0.4, 0.4, 0.4]);
    const result = ditherFloydSteinberg2D(source, true);

    expect(pixels(result.image.values)).toEqual([0, 1, 0, 0]);
    expect(result.debug?.adjustedIntensity?.[1]).toBeCloseTo(0.575);
    expect(result.debug?.adjustedIntensity?.[2]).toBeCloseTo(0.4453125);
  });

  it("keeps full line compensation when a line is clipped", () => {
    const source = intensity(2, 1, [0, 0]);
    expect(pixels(ditherFloydSteinbergLines(source, 3, false).image.values)).toEqual([
      0, 1,
    ]);
  });

  it("preserves the source buffer across error-diffusion runs", () => {
    const source = intensity(2, 2, [0.4, 0.4, 0.4, 0.4]);
    const before = Array.from(source.values);
    ditherFloydSteinberg2D(source, true);
    expect(Array.from(source.values)).toEqual(before);
  });

  it("produces repeatable coordinate thresholds for the same seed", () => {
    const source = intensity(4, 1, [0.2, 0.4, 0.6, 0.8]);
    const first = ditherRandomThreshold(source, 0.5, 0.5, 42, true);
    const second = ditherRandomThreshold(source, 0.5, 0.5, 42, true);
    expect(pixels(first.image.values)).toEqual(pixels(second.image.values));
    expect(Array.from(first.randomThresholds ?? [])).toEqual(
      Array.from(second.randomThresholds ?? []),
    );
  });

  it("changes the random threshold field when the seed changes", () => {
    const source = intensity(4, 1, [0.5, 0.5, 0.5, 0.5]);
    const first = ditherRandomThreshold(source, 0.5, 0.5, 42, true);
    const second = ditherRandomThreshold(source, 0.5, 0.5, 43, true);
    expect(Array.from(first.randomThresholds ?? [])).not.toEqual(
      Array.from(second.randomThresholds ?? []),
    );
  });
});

describe("coordinate random hash", () => {
  it("is deterministic and produces a value in [0, 1)", () => {
    const first = coordinateRandom(17, 29, 12345);
    expect(first).toBe(coordinateRandom(17, 29, 12345));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
  });

  it("mixes coordinates and seed independently", () => {
    const base = hashPixelCoordinates(17, 29, 12345);
    expect(hashPixelCoordinates(18, 29, 12345)).not.toBe(base);
    expect(hashPixelCoordinates(17, 30, 12345)).not.toBe(base);
    expect(hashPixelCoordinates(17, 29, 12346)).not.toBe(base);
  });
});

describe("backward line rasterization", () => {
  it("draws a normal three-pixel upper-left line", () => {
    const result = rasterizedLine(3, 3, 3);
    expect(result[15]).toBe(0);
    expect(result[10]).toBe(0);
    expect(result[5]).toBe(0);
    expect(result.filter((value) => value === 0)).toHaveLength(3);
  });

  it("clips near x = 0", () => {
    const result = rasterizedLine(0, 3, 3);
    expect(result[12]).toBe(0);
    expect(result.filter((value) => value === 0)).toHaveLength(1);
  });

  it("clips near y = 0", () => {
    const result = rasterizedLine(3, 0, 3);
    expect(result[3]).toBe(0);
    expect(result.filter((value) => value === 0)).toHaveLength(1);
  });

  it("clips near both top and left boundaries", () => {
    const result = rasterizedLine(0, 0, 3);
    expect(result[0]).toBe(0);
    expect(result.filter((value) => value === 0)).toHaveLength(1);
  });
});
