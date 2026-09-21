import { describe, expect, it } from "vitest";
import {
  findNearestPaletteColor,
  squaredRgbDistance,
} from "./nearestPaletteColor";
import { hexColorToRgb, resolvePalette, type RgbColor } from "./palettes";
import { quantizeToFixedPalette } from "./methods/fixed-palette/algorithm.cpu";
import { ditherFixedPaletteFloydSteinberg } from "./methods/fixed-palette/algorithm.floyd-steinberg.cpu";
import type { RgbaImage } from "./types";

const black: RgbColor = { red: 0, green: 0, blue: 0 };
const white: RgbColor = { red: 255, green: 255, blue: 255 };

describe("nearest RGB palette color", () => {
  it.each([
    [{ red: 0, green: 0, blue: 0 }, 0],
    [{ red: 255, green: 255, blue: 255 }, 1],
    [{ red: 20, green: 20, blue: 20 }, 0],
    [{ red: 240, green: 240, blue: 240 }, 1],
  ] as const)("maps an obvious black/white input", (source, expectedIndex) => {
    expect(findNearestPaletteColor(source, [black, white]).index).toBe(
      expectedIndex,
    );
  });

  it("selects the nearest entry from a multi-color palette", () => {
    const palette = [
      { red: 255, green: 0, blue: 0 },
      { red: 0, green: 255, blue: 0 },
      { red: 0, green: 0, blue: 255 },
    ];
    const nearest = findNearestPaletteColor(
      { red: 240, green: 30, blue: 20 },
      palette,
    );
    expect(nearest.index).toBe(0);
    expect(nearest.color).toEqual(palette[0]);
  });

  it("keeps the first palette entry when distances are exactly tied", () => {
    const first = { red: 2, green: 0, blue: 0 };
    const second = { red: 0, green: 0, blue: 0 };
    const nearest = findNearestPaletteColor(
      { red: 1, green: 0, blue: 0 },
      [first, second],
    );
    expect(nearest.index).toBe(0);
    expect(nearest.color).toBe(first);
  });

  it("uses squared distance without a square root", () => {
    expect(
      squaredRgbDistance(
        { red: 10, green: 20, blue: 30 },
        { red: 13, green: 24, blue: 42 },
      ),
    ).toBe(9 + 16 + 144);
  });
});

describe("fixed palette quantization", () => {
  it("writes palette colors, preserves alpha, and records debug error", () => {
    const source: RgbaImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        20, 20, 20, 80,
        240, 240, 240, 160,
      ]),
    };
    const result = quantizeToFixedPalette(source, [black, white], true);

    expect(Array.from(result.image.data)).toEqual([
      0, 0, 0, 80,
      255, 255, 255, 160,
    ]);
    expect(Array.from(result.errorSquared ?? [])).toEqual([1200, 675]);
  });

  it("resolves custom hexadecimal colors in their original order", () => {
    expect(hexColorToRgb("#12a0ff")).toEqual({
      red: 18,
      green: 160,
      blue: 255,
    });
    expect(resolvePalette("custom", ["#ffffff", "#000000"])).toEqual([
      white,
      black,
    ]);
  });
});

describe("fixed palette Floyd-Steinberg diffusion", () => {
  it("propagates an RGB error vector to the next raster pixel", () => {
    const source: RgbaImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        100, 50, 20, 255,
        0, 0, 0, 255,
      ]),
    };
    const result = ditherFixedPaletteFloydSteinberg(
      source,
      [black, white],
      true,
    );

    expect(Array.from(result.image.data)).toEqual([
      0, 0, 0, 255,
      0, 0, 0, 255,
    ]);
    expect(Array.from(result.adjustedRgb?.slice(0, 3) ?? [])).toEqual([
      100, 50, 20,
    ]);
    expect(Array.from(result.adjustedRgb?.slice(3, 6) ?? [])).toEqual([
      43.75, 21.875, 8.75,
    ]);
  });

  it("does not clamp negative propagated working values", () => {
    const source: RgbaImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        200, 0, 0, 255,
        0, 0, 0, 255,
      ]),
    };
    const redOnly = [{ red: 255, green: 0, blue: 0 }];
    const result = ditherFixedPaletteFloydSteinberg(source, redOnly, true);

    expect(result.adjustedRgb?.[3]).toBeCloseTo(-24.0625);
  });

  it("emits only colors from the selected palette and preserves the source", () => {
    const source: RgbaImage = {
      width: 3,
      height: 2,
      data: new Uint8ClampedArray([
        30, 80, 140, 255,
        230, 40, 20, 200,
        120, 220, 60, 180,
        250, 250, 210, 160,
        90, 20, 180, 140,
        10, 10, 10, 120,
      ]),
    };
    const before = Array.from(source.data);
    const palette = [
      black,
      white,
      { red: 255, green: 0, blue: 0 },
      { red: 0, green: 0, blue: 255 },
    ];
    const result = ditherFixedPaletteFloydSteinberg(source, palette);

    for (let pixel = 0; pixel < result.image.data.length; pixel += 4) {
      const outputColor = {
        red: result.image.data[pixel],
        green: result.image.data[pixel + 1],
        blue: result.image.data[pixel + 2],
      };
      expect(palette).toContainEqual(outputColor);
    }
    expect(Array.from(source.data)).toEqual(before);
  });
});
