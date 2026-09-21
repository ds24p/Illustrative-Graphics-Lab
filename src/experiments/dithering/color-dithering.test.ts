import { describe, expect, it } from "vitest";
import { quantizeRgbChannel } from "./colorQuantization";
import {
  bayerThresholdAt,
  orderedDitherRgbLevels,
  type BayerMatrixSize,
} from "./methods/rgb-levels-ordered/algorithm.cpu";
import { quantizeRgbLevels } from "./methods/rgb-levels/algorithm.cpu";
import type { RgbaImage } from "./types";

function rgbaImage(pixels: number[][], width = pixels.length): RgbaImage {
  return {
    width,
    height: pixels.length / width,
    data: new Uint8ClampedArray(pixels.flat()),
  };
}

function rgbPixels(image: RgbaImage) {
  const pixels: number[][] = [];
  for (let index = 0; index < image.data.length; index += 4) {
    pixels.push(Array.from(image.data.slice(index, index + 4)));
  }
  return pixels;
}

function allowedChannelValues(levels: number) {
  return new Set(
    Array.from({ length: levels }, (_, index) =>
      Math.round((index * 255) / (levels - 1)),
    ),
  );
}

describe("RGB level quantization", () => {
  it.each([2, 3, 4])(
    "preserves black, white, and pure RGB primaries for L = %i",
    (levels) => {
      const source = rgbaImage([
        [0, 0, 0, 255],
        [255, 255, 255, 255],
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
      ]);

      expect(rgbPixels(quantizeRgbLevels(source, levels))).toEqual(
        rgbPixels(source),
      );
    },
  );

  it("quantizes middle gray independently at L = 2, 3, and 4", () => {
    expect(quantizeRgbChannel(128, 2)).toBe(255);
    expect(quantizeRgbChannel(128, 3)).toBe(128);
    expect(quantizeRgbChannel(128, 4)).toBe(170);
  });

  it("places colors on the expected side of quantization boundaries", () => {
    expect([127, 128].map((value) => quantizeRgbChannel(value, 2))).toEqual([
      0, 255,
    ]);
    expect(
      [63, 64, 191, 192].map((value) => quantizeRgbChannel(value, 3)),
    ).toEqual([0, 128, 128, 255]);
    expect(
      [42, 43, 127, 128, 212, 213].map((value) =>
        quantizeRgbChannel(value, 4),
      ),
    ).toEqual([0, 85, 85, 170, 170, 255]);
  });

  it.each([2, 3, 4])(
    "only emits one of the L discrete values in every channel for L = %i",
    (levels) => {
      const source = rgbaImage([
        [12, 47, 93, 10],
        [126, 128, 130, 64],
        [171, 212, 249, 200],
      ]);
      const result = quantizeRgbLevels(source, levels);
      const allowed = allowedChannelValues(levels);

      rgbPixels(result).forEach((pixel, index) => {
        expect(allowed.has(pixel[0])).toBe(true);
        expect(allowed.has(pixel[1])).toBe(true);
        expect(allowed.has(pixel[2])).toBe(true);
        expect(pixel[3]).toBe(source.data[index * 4 + 3]);
      });
    },
  );
});

describe("ordered RGB level dithering", () => {
  it("uses the 2 x 2 Bayer thresholds to split middle gray between two levels", () => {
    const source = rgbaImage(
      Array.from({ length: 4 }, () => [128, 128, 128, 255]),
      2,
    );

    expect(rgbPixels(orderedDitherRgbLevels(source, 2, 2))).toEqual([
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);
  });

  it.each([2, 3, 4])(
    "keeps every channel on a valid quantization level for L = %i",
    (levels) => {
      const source = rgbaImage(
        [
          [0, 64, 127, 255],
          [128, 191, 255, 192],
          [43, 129, 213, 128],
          [12, 100, 240, 64],
        ],
        2,
      );
      const allowed = allowedChannelValues(levels);

      for (const size of [2, 4, 8] as BayerMatrixSize[]) {
        const result = orderedDitherRgbLevels(source, levels, size);
        rgbPixels(result).forEach((pixel) => {
          expect(allowed.has(pixel[0])).toBe(true);
          expect(allowed.has(pixel[1])).toBe(true);
          expect(allowed.has(pixel[2])).toBe(true);
        });
      }
    },
  );

  it("keeps Bayer thresholds strictly between zero and one", () => {
    for (const size of [2, 4, 8] as BayerMatrixSize[]) {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          expect(bayerThresholdAt(x, y, size)).toBeGreaterThan(0);
          expect(bayerThresholdAt(x, y, size)).toBeLessThan(1);
        }
      }
    }
  });
});
