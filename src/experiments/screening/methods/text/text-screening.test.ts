import { describe, expect, it } from "vitest";
import type { IntensityImage } from "../../types";
import {
  averageCellIntensity,
  mapAverageToLevel,
  screenWithText,
} from "./algorithm.cpu";
import type { GlyphAtlas, GlyphRaster } from "./types";

function intensity(
  width: number,
  height: number,
  values: number[],
): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

function glyph(width: number, height: number, values: number[]): GlyphRaster {
  return { width, height, values: new Float32Array(values) };
}

function constantAtlas(
  cellWidth: number,
  cellHeight: number,
  levelCount = 8,
  characters = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
): GlyphAtlas {
  return {
    cellWidth,
    cellHeight,
    characters,
    levels: Array.from({ length: levelCount }, (_, level) =>
      characters.map((_, characterIndex) => {
        const value = (level * characters.length + characterIndex) /
          (levelCount * characters.length);
        return glyph(
          cellWidth,
          cellHeight,
          new Array(cellWidth * cellHeight).fill(value),
        );
      }),
    ),
  };
}

describe("Text Screening cell averaging", () => {
  it("averages a uniform cell", () => {
    const source = intensity(2, 2, [0.25, 0.25, 0.25, 0.25]);
    expect(averageCellIntensity(source, 0, 0, 2, 2)).toBeCloseTo(0.25);
  });

  it("averages known mixed intensities", () => {
    const source = intensity(2, 2, [0, 0.25, 0.75, 1]);
    expect(averageCellIntensity(source, 0, 0, 2, 2)).toBeCloseTo(0.5);
  });

  it("divides a partial edge cell by its valid pixel count", () => {
    const source = intensity(3, 2, [0, 0, 0.25, 0, 0, 0.75]);
    expect(averageCellIntensity(source, 2, 0, 2, 2)).toBeCloseTo(0.5);
  });
});

describe("Text Screening level mapping", () => {
  it.each([
    [0, 0],
    [1, 7],
    [0.25, 2],
    [0.5, 4],
    [3.49 / 7, 3],
    [3.5 / 7, 4],
  ])("maps average %s to level %s", (average, expected) => {
    expect(mapAverageToLevel(average, 8)).toBe(expected);
  });

  it("clamps helper inputs outside the normalized intensity range", () => {
    expect(mapAverageToLevel(-0.5, 8)).toBe(0);
    expect(mapAverageToLevel(1.5, 8)).toBe(7);
  });
});

describe("Text Screening deterministic character selection", () => {
  const source = intensity(8, 1, new Array(8).fill(0.5));
  const atlas = constantAtlas(1, 1);

  it("repeats character choices for the same seed", () => {
    const first = screenWithText(source, atlas, 12345, true);
    const second = screenWithText(source, atlas, 12345, true);
    expect(first.cells?.map((cell) => cell.character)).toEqual(
      second.cells?.map((cell) => cell.character),
    );
  });

  it("changes at least one character for a different seed", () => {
    const first = screenWithText(source, atlas, 1, true);
    const second = screenWithText(source, atlas, 2, true);
    expect(first.cells?.map((cell) => cell.character)).not.toEqual(
      second.cells?.map((cell) => cell.character),
    );
  });

  it("never lets the seed change block averages or levels", () => {
    const first = screenWithText(source, atlas, 10, true);
    const second = screenWithText(source, atlas, 999, true);
    expect(first.cells?.map((cell) => cell.averageIntensity)).toEqual(
      second.cells?.map((cell) => cell.averageIntensity),
    );
    expect(first.cells?.map((cell) => cell.level)).toEqual(
      second.cells?.map((cell) => cell.level),
    );
  });
});

describe("Text Screening glyph output", () => {
  it("copies the selected glyph and preserves grayscale values", () => {
    const atlas: GlyphAtlas = {
      cellWidth: 2,
      cellHeight: 2,
      characters: ["A"],
      levels: [[glyph(2, 2, [0, 0.25, 0.5, 1])]],
    };
    const result = screenWithText(intensity(2, 2, [0, 0, 0, 0]), atlas, 0);
    expect(Array.from(result.image.values)).toEqual([0, 0.25, 0.5, 1]);
  });

  it("clips glyphs at right and bottom image boundaries", () => {
    const atlas: GlyphAtlas = {
      cellWidth: 2,
      cellHeight: 2,
      characters: ["A"],
      levels: [[glyph(2, 2, [0.1, 0.2, 0.3, 0.4])]],
    };
    const source = intensity(3, 3, new Array(9).fill(0));
    const result = screenWithText(source, atlas, 0, true);
    expect(Array.from(result.image.values)).toEqual([
      expect.closeTo(0.1), expect.closeTo(0.2), expect.closeTo(0.1),
      expect.closeTo(0.3), expect.closeTo(0.4), expect.closeTo(0.3),
      expect.closeTo(0.1), expect.closeTo(0.2), expect.closeTo(0.1),
    ]);
    expect(result.cells?.at(-1)).toMatchObject({ x: 2, y: 2, width: 1, height: 1 });
  });

  it("screens a tiny image end to end and creates educational maps", () => {
    const atlas: GlyphAtlas = {
      cellWidth: 2,
      cellHeight: 2,
      characters: ["A"],
      levels: [
        [glyph(2, 2, [1, 0.75, 0.5, 0.25])],
        [glyph(2, 2, [0, 0.1, 0.2, 0.3])],
      ],
    };
    const source = intensity(4, 2, [0, 0, 1, 1, 0, 0, 1, 1]);
    const result = screenWithText(source, atlas, 7, true);

    expect(result.cells?.map((cell) => cell.level)).toEqual([0, 1]);
    expect(Array.from(result.image.values)).toEqual([
      1, 0.75, 0, expect.closeTo(0.1),
      0.5, 0.25, expect.closeTo(0.2), expect.closeTo(0.3),
    ]);
    expect(Array.from(result.debug?.blockAverageMap ?? [])).toEqual([
      0, 0, 1, 1, 0, 0, 1, 1,
    ]);
    expect(Array.from(result.debug?.levelMap ?? [])).toEqual([
      0, 0, 1, 1, 0, 0, 1, 1,
    ]);
  });
});
