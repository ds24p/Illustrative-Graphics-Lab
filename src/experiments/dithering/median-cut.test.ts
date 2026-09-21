import { describe, expect, it } from "vitest";
import { quantizeToFixedPalette } from "./methods/fixed-palette/algorithm.cpu";
import { generateMedianCutPalette } from "./methods/median-cut/algorithm.cpu";
import type { RgbaImage } from "./types";

function image(colors: number[][]): RgbaImage {
  return {
    width: colors.length,
    height: 1,
    data: new Uint8ClampedArray(colors.flatMap((color) => [...color, 255])),
  };
}

describe("Median Cut palette generation", () => {
  it("is deterministic for the same image and requested size", () => {
    const source = image([
      [5, 10, 15],
      [20, 25, 30],
      [220, 40, 30],
      [240, 60, 40],
      [30, 200, 80],
      [50, 230, 90],
    ]);
    expect(generateMedianCutPalette(source, 3)).toEqual(
      generateMedianCutPalette(source, 3),
    );
  });

  it("produces the requested number of colors when boxes remain splittable", () => {
    const source = image([
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [255, 0, 255],
      [0, 255, 255],
      [255, 255, 255],
    ]);
    expect(generateMedianCutPalette(source, 3)).toHaveLength(3);
    expect(generateMedianCutPalette(source, 6)).toHaveLength(6);
  });

  it("changes the generated palette when palette size changes", () => {
    const source = image([
      [0, 0, 0],
      [60, 20, 10],
      [120, 80, 20],
      [180, 140, 60],
      [240, 220, 180],
    ]);
    const twoColors = generateMedianCutPalette(source, 2);
    const fourColors = generateMedianCutPalette(source, 4);
    expect(twoColors).toHaveLength(2);
    expect(fourColors).toHaveLength(4);
    expect(fourColors).not.toEqual(twoColors);
  });

  it("uses the rounded average as a box representative", () => {
    const source = image([
      [0, 10, 20],
      [11, 20, 31],
    ]);
    expect(generateMedianCutPalette(source, 1)).toEqual([
      { red: 6, green: 15, blue: 26 },
    ]);
  });

  it("stops below the request when the image has no remaining color range", () => {
    const source = image(Array.from({ length: 8 }, () => [30, 40, 50]));
    expect(generateMedianCutPalette(source, 8)).toEqual([
      { red: 30, green: 40, blue: 50 },
    ]);
  });

  it("uses generated colors for quantization without mutating the source", () => {
    const source = image([
      [10, 20, 30],
      [80, 90, 100],
      [160, 170, 180],
      [240, 250, 255],
    ]);
    const before = Array.from(source.data);
    const palette = generateMedianCutPalette(source, 3);
    const result = quantizeToFixedPalette(source, palette);

    for (let pixel = 0; pixel < result.image.data.length; pixel += 4) {
      expect(palette).toContainEqual({
        red: result.image.data[pixel],
        green: result.image.data[pixel + 1],
        blue: result.image.data[pixel + 2],
      });
    }
    expect(Array.from(source.data)).toEqual(before);
  });
});
