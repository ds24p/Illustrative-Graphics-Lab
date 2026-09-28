import { describe, expect, it } from "vitest";
import { builtInBrushTypes, clearBrushMaskCache, generateBrushMask, getBrushMask } from "./brushes";

describe("procedural brush masks", () => {
  it("generates bounded deterministic masks for every built-in brush", () => {
    for (const type of builtInBrushTypes) {
      const first = generateBrushMask(type, 32, 24, 17);
      const second = generateBrushMask(type, 32, 24, 17);
      expect(first).toEqual(second);
      expect(first.data.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    }
  });

  it("keeps the built-in brush characters measurably different", () => {
    const soft = generateBrushMask("soft", 32, 32, 17);
    const flat = generateBrushMask("flat", 32, 32, 17);
    const bristle = generateBrushMask("bristle", 32, 32, 17);
    const dry = generateBrushMask("dry", 32, 32, 17);
    const rough = generateBrushMask("rough", 32, 32, 17);
    expect(soft.data).not.toEqual(flat.data);
    expect(new Set(Array.from(bristle.data, (value) => value.toFixed(3))).size).toBeGreaterThan(8);
    expect(Array.from(dry.data).filter((value) => value < 0.02).length).toBeGreaterThan(0);
    expect(new Set(Array.from(rough.data, (value) => value.toFixed(3))).size).toBeGreaterThan(8);
    expect(rough.data).not.toEqual(dry.data);
  });

  it("caches valid custom alpha and luminance masks and rejects malformed data", () => {
    clearBrushMaskCache();
    const alphaSource = { id: "alpha", name: "alpha", previewUrl: "", imageData: { width: 2, height: 1, data: new Uint8ClampedArray([10, 20, 30, 0, 10, 20, 30, 255]) } };
    const first = getBrushMask("custom", 1, alphaSource as never, 8, 4);
    expect(getBrushMask("custom", 1, alphaSource as never, 8, 4)).toBe(first);
    expect(first.data[0]).toBe(0);
    expect(first.data[first.data.length - 1]).toBe(1);
    const luminanceSource = { id: "rgb", name: "rgb", previewUrl: "", imageData: { width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) } };
    expect(getBrushMask("custom", 1, luminanceSource as never, 4, 4).data[0]).toBe(1);
    const invalid = { id: "invalid", name: "invalid", previewUrl: "", imageData: { width: 0, height: 0, data: new Uint8ClampedArray() } };
    expect(() => getBrushMask("custom", 1, invalid as never)).toThrow(/invalid pixel data/);
  });
});
