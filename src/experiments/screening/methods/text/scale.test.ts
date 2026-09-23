import { describe, expect, it } from "vitest";
import type { IntensityImage } from "../../types";
import { textScreeningParameters } from "../../parameters";
import { screenWithText } from "./algorithm.cpu";
import { getTextCellDimensions, scaleGlyphAtlas } from "./scale";
import type { GlyphAtlas } from "./types";

function atlas(): GlyphAtlas {
  return {
    cellWidth: 8,
    cellHeight: 14,
    characters: ["A", "B"],
    levels: Array.from({ length: 8 }, (_, level) =>
      [0, 1].map((character) => ({
        width: 8,
        height: 14,
        values: Float32Array.from({ length: 8 * 14 }, (_, index) =>
          (level * 16 + character * 8 + (index % 8)) / 128,
        ),
      })),
    ),
  };
}

function source(width: number, height: number): IntensityImage {
  return {
    width,
    height,
    values: Float32Array.from({ length: width * height }, (_, index) =>
      (index % width) / Math.max(1, width - 1),
    ),
  };
}

describe("Text Scale dimensions and reference behavior", () => {
  it("shows the effective cell size in the generic range value", () => {
    const scale = textScreeningParameters.find(
      (parameter) => parameter.key === "textScale",
    );
    expect(scale?.kind).toBe("range");
    if (scale?.kind === "range") {
      expect(scale.formatValue?.(1)).toBe("1.0x (8 x 14 px)");
      expect(scale.formatValue?.(1.25)).toBe("1.25x (10 x 18 px)");
      expect(scale.formatValue?.(2)).toBe("2.0x (16 x 28 px)");
    }
  });

  it("keeps the original atlas and output untouched at 1x", () => {
    const original = atlas();
    const input = source(17, 29);
    expect(scaleGlyphAtlas(original, 1)).toBe(original);
    expect(screenWithText(input, scaleGlyphAtlas(original, 1), 42).image.values)
      .toEqual(screenWithText(input, original, 42).image.values);
  });

  it("uses 16 x 28 cells at 2x and fills the entire scaled glyph", () => {
    const scaled = scaleGlyphAtlas(atlas(), 2);
    expect(getTextCellDimensions(2)).toEqual({ width: 16, height: 28 });
    expect([scaled.cellWidth, scaled.cellHeight]).toEqual([16, 28]);
    const result = screenWithText(source(16, 28), scaled, 42, true);
    expect(result.cells).toHaveLength(1);
    expect(result.cells?.[0]).toMatchObject({ width: 16, height: 28 });
    expect(result.image.values[27 * 16 + 15]).toBeLessThan(1);
  });

  it("rounds fractional scales and enforces at least one pixel", () => {
    expect(getTextCellDimensions(1.25)).toEqual({ width: 10, height: 18 });
    expect(getTextCellDimensions(0.01)).toEqual({ width: 1, height: 1 });
    expect(getTextCellDimensions(0.01)).toEqual({
      width: scaleGlyphAtlas(atlas(), 0.01).cellWidth,
      height: scaleGlyphAtlas(atlas(), 0.01).cellHeight,
    });
    expect(() => getTextCellDimensions(0)).toThrow();
  });
});

describe("scaled Text Screening raster and debug views", () => {
  it("clips scaled glyphs at partial right and bottom cells", () => {
    const input = source(17, 29);
    const scaled = scaleGlyphAtlas(atlas(), 2);
    const result = screenWithText(input, scaled, 42, true);

    expect(result.cells?.map(({ x, y, width, height }) => [x, y, width, height]))
      .toEqual([
        [0, 0, 16, 28],
        [16, 0, 1, 28],
        [0, 28, 16, 1],
        [16, 28, 1, 1],
      ]);
    expect(result.image.values).toHaveLength(17 * 29);
    expect(result.image.values[16]).toBeLessThan(1);
    expect(result.image.values[28 * 17 + 16]).toBeLessThan(1);
    expect(result.debug?.selectedGlyphMap).toEqual(result.image.values);
    expect(result.debug?.blockAverageMap[16]).toBeCloseTo(1);
    expect(result.debug?.blockAverageMap[0]).toBeLessThan(1);
  });

  it("is byte-identical for the same seed and scale with or without debug", () => {
    const input = source(41, 37);
    const scaled = scaleGlyphAtlas(atlas(), 1.75);
    const first = screenWithText(input, scaled, 12345, true);
    const second = screenWithText(input, scaled, 12345, false);
    const repeated = screenWithText(input, scaleGlyphAtlas(atlas(), 1.75), 12345);

    expect(first.image.values).toEqual(second.image.values);
    expect(first.image.values).toEqual(repeated.image.values);
    expect(first.debug?.levelMap).toHaveLength(41 * 37);
  });

  it("changes the cell partition when the scale changes", () => {
    const input = source(32, 56);
    const original = screenWithText(input, atlas(), 7, true);
    const doubled = screenWithText(input, scaleGlyphAtlas(atlas(), 2), 7, true);
    expect(original.cells).toHaveLength(16);
    expect(doubled.cells).toHaveLength(4);
    expect(original.cells?.[1].x).toBe(8);
    expect(doubled.cells?.[1].x).toBe(16);
  });

  it("lets the seed change letters but not scaled cell averages or levels", () => {
    const input = source(41, 37);
    const scaled = scaleGlyphAtlas(atlas(), 2);
    const first = screenWithText(input, scaled, 10, true);
    const second = screenWithText(input, scaled, 999, true);
    expect(first.cells?.map((cell) => cell.averageIntensity)).toEqual(
      second.cells?.map((cell) => cell.averageIntensity),
    );
    expect(first.cells?.map((cell) => cell.level)).toEqual(
      second.cells?.map((cell) => cell.level),
    );
  });

  it("uses deterministic bilinear interpolation and retains gray edges", () => {
    const small: GlyphAtlas = {
      cellWidth: 2,
      cellHeight: 2,
      characters: ["A"],
      levels: [[{
        width: 2,
        height: 2,
        values: new Float32Array([0, 0.25, 0.5, 1]),
      }]],
    };
    const scaled = scaleGlyphAtlas(small, 2);
    expect(scaled.levels[0][0].values[1 * 4 + 1]).toBeCloseTo(0.203125);
    expect(scaled.levels[0][0].values[0]).toBe(0);
    expect(scaled.levels[0][0].values[15]).toBe(1);
  });
});
