import { afterEach, describe, expect, it, vi } from "vitest";
import { blurReference } from "./blur";
import { colorError, computeErrorMap, MAX_RGB_ERROR, selectStrokeSeeds } from "./error";
import { painterlyRenderingExperiment } from "./experiment";
import { contourDirection, sobelGradients } from "./gradients";
import { sourceRgb, whiteCanvas } from "./image";
import { paintSingleScale } from "./methods/hertzmann/algorithm.cpu";
import { hertzmannCpuBackend } from "./methods/hertzmann/backend.cpu";
import { painterlyDefaults, resolvePainterlyParameters } from "./parameters";
import { seededRandom, shuffleStrokes } from "./random";
import { continuousDirection, generateStroke } from "./strokes";
import type { GradientField } from "./types";

afterEach(() => vi.unstubAllGlobals());

function source(width = 24, height = 24, pixel = (x: number, y: number) => [x * 5, y * 5, 20, 255]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  }
  return { width, height, data } as ImageData;
}

function horizontalField(width: number, height: number): GradientField {
  return { width, height, gx: new Float32Array(width * height), gy: new Float32Array(width * height).fill(-1), magnitude: new Float32Array(width * height).fill(1) };
}

const options = { radius: 1, step: 1, minSegments: 4, maxSegments: 16, smoothing: 0.5 };

describe("painterly image processing", () => {
  it("composites transparent source pixels over white without mutating the source", () => {
    const input = source(1, 1, () => [10, 80, 120, 0]);
    expect([...sourceRgb(input).data]).toEqual([255, 255, 255]);
    expect([...input.data]).toEqual([10, 80, 120, 0]);
    const half = sourceRgb(source(1, 1, () => [0, 0, 0, 128]));
    expect(half.data[0]).toBeCloseTo(127);
  });

  it("preserves constant RGB and handles single-pixel blur boundaries", () => {
    const input = sourceRgb(source(3, 2, () => [70, 90, 110, 255]));
    expect(blurReference(input, 2).data).toEqual(input.data);
    expect(blurReference(sourceRgb(source(1, 1, () => [20, 30, 40, 255])), 4).data).toEqual(new Float32Array([20, 30, 40]));
    expect(blurReference(input, 0).data).not.toBe(input.data);
  });

  it("blurs an impulse symmetrically while retaining fractional samples", () => {
    const input = sourceRgb(source(9, 9, (x, y) => x === 4 && y === 4 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
    const result = blurReference(input, 1);
    const at = (x: number, y: number) => result.data[(y * 9 + x) * 3];
    expect(at(4, 4)).toBeLessThan(255);
    expect(at(3, 4)).toBeGreaterThan(0);
    expect(at(3, 4)).toBeCloseTo(at(5, 4));
    expect(at(4, 3)).toBeCloseTo(at(4, 5));
    expect(at(3, 4)).not.toBe(Math.round(at(3, 4)));
  });

  it.each(["x", "y"])("Sobel on a %s ramp produces perpendicular contour directions", (axis) => {
    const input = sourceRgb(source(9, 9, (x, y) => { const v = (axis === "x" ? x : y) * 20; return [v, v, v, 255]; }));
    const field = sobelGradients(input);
    const i = 4 * 9 + 4;
    expect(field[axis === "x" ? "gx" : "gy"][i]).toBeCloseTo(160 / 255);
    const d = contourDirection(field, { x: 4.5, y: 4.5 })!;
    expect(d.x * field.gx[i] + d.y * field.gy[i]).toBeCloseTo(0);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    expect(axis === "x" ? d.x : d.y).toBeCloseTo(0);
  });

  it("uses course Processing brightness and safely reports absent gradients", () => {
    const input = sourceRgb(source(9, 2, (x) => [200, x * 10, 0, 255]));
    const field = sobelGradients(input);
    expect(field.magnitude.every((value) => value === 0)).toBe(true);
    expect(contourDirection(field, { x: 4.5, y: 0.5 })).toBeUndefined();
  });

  it("computes squared RGB error on the documented 0–195075 scale", () => {
    expect(colorError({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(MAX_RGB_ERROR);
    const input = sourceRgb(source(1, 1, () => [255, 245, 235, 255]));
    expect(computeErrorMap(input, whiteCanvas(1, 1))[0]).toBe(500);
    expect(() => computeErrorMap(input, whiteCanvas(2, 1))).toThrow(/dimensions/);
  });

  it("uses cell mean, chooses the maximum, and includes partial edge cells", () => {
    const errors = new Float32Array([1, 9, 5, 1, 1, 7]);
    expect(selectStrokeSeeds(errors, 3, 2, 2, 3)).toEqual([{ x: 2.5, y: 1.5 }]);
    expect(selectStrokeSeeds(errors, 3, 2, 2, 2)).toEqual([{ x: 1.5, y: 0.5 }, { x: 2.5, y: 1.5 }]);
    expect(selectStrokeSeeds(new Float32Array(9).fill(8), 3, 3, 3, 0)).toEqual([{ x: 1.5, y: 1.5 }]);
  });
});

describe("curved stroke generation", () => {
  it("aligns reversed field directions before smoothing and normalizes the blend", () => {
    expect(continuousDirection({ x: -1, y: 0 }, { x: 1, y: 0 }, 0.5)).toEqual({ x: 1, y: 0 });
    expect(continuousDirection({ x: 0, y: 1 }, { x: 1, y: 0 }, 0)).toEqual({ x: 0, y: 1 });
    expect(continuousDirection({ x: 0, y: 1 }, { x: 1, y: 0 }, 1)).toEqual({ x: 1, y: 0 });
    const blend = continuousDirection({ x: 0, y: 1 }, { x: 1, y: 0 }, 0.5);
    expect(blend.x).toBeCloseTo(Math.SQRT1_2);
    expect(blend.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("traces along an edge instead of crossing its gradient", () => {
    const image = sourceRgb(source(30, 30, (x) => [x * 5, x * 5, x * 5, 255]));
    const stroke = generateStroke({ x: 10.5, y: 3.5 }, image, whiteCanvas(30, 30), sobelGradients(image), options, seededRandom(1));
    expect(stroke.points).toHaveLength(17);
    expect(stroke.points.every((point) => point.x === 10.5)).toBe(true);
    expect(stroke.points.at(-1)!.y).toBeCloseTo(19.5);
  });

  it("honors the minimum before stopping at an already better canvas sample", () => {
    const image = sourceRgb(source(30, 3, (x) => x < 2 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const stroke = generateStroke({ x: 0.5, y: 1.5 }, image, whiteCanvas(30, 3), horizontalField(30, 3), options, seededRandom(1));
    expect(stroke.points).toHaveLength(5);
    expect(stroke.points.at(-1)).toEqual({ x: 4.5, y: 1.5 });
  });

  it("traces curved fields and avoids zig-zags across sign changes", () => {
    const image = sourceRgb(source(50, 50, () => [30, 40, 50, 255]));
    const field = horizontalField(50, 50);
    for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) {
      const angle = x / 50;
      const sign = x % 2 ? -1 : 1;
      const i = y * 50 + x;
      field.gx[i] = sign * Math.sin(angle); field.gy[i] = -sign * Math.cos(angle);
    }
    const stroke = generateStroke({ x: 4.5, y: 10.5 }, image, whiteCanvas(50, 50), field, options, seededRandom(1));
    expect(stroke.points).toHaveLength(17);
    expect(stroke.points.at(-1)!.y).toBeGreaterThan(12);
    for (let i = 2; i < stroke.points.length; i++) {
      const [a, b, c] = stroke.points.slice(i - 2, i + 1);
      expect((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)).toBeGreaterThan(0);
    }
  });

  it("clips at boundaries without repeated or out-of-bounds endpoints", () => {
    const image = sourceRgb(source(4, 3, () => [0, 0, 0, 255]));
    const stroke = generateStroke({ x: 1.5, y: 1.5 }, image, whiteCanvas(4, 3), horizontalField(4, 3), { ...options, step: 8 }, seededRandom(1));
    expect(stroke.points).toEqual([{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }]);
  });

  it.each([[1, 1], [1, 8], [8, 1], [24, 24]])("handles flat %ix%i images with finite bounded strokes", (width, height) => {
    const input = source(width, height, () => [0, 0, 0, 255]);
    const run = paintSingleScale(input, painterlyDefaults);
    expect(run.strokes.length).toBeGreaterThan(0);
    for (const stroke of run.strokes) {
      expect(stroke.points.length).toBeLessThanOrEqual(painterlyDefaults.maxStrokeLength + 1);
      for (const [i, point] of stroke.points.entries()) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(0.5);
        expect(point.x).toBeLessThanOrEqual(width - 0.5);
        expect(point.y).toBeGreaterThanOrEqual(0.5);
        expect(point.y).toBeLessThanOrEqual(height - 0.5);
        if (i > 0) expect(point).not.toEqual(stroke.points[i - 1]);
      }
    }
  });
});

describe("single-scale integration", () => {
  it("reproduces geometry and order, changes order with seed, and preserves the source", () => {
    const input = source();
    const saved = input.data.slice();
    const first = paintSingleScale(input, painterlyDefaults);
    expect(paintSingleScale(input, painterlyDefaults).strokes).toEqual(first.strokes);
    expect(paintSingleScale(input, { ...painterlyDefaults, seed: 42 }).strokes).not.toEqual(first.strokes);
    expect(input.data).toEqual(saved);
    const a = Array.from({ length: 20 }, (_, i) => i), b = [...a], c = [...a];
    shuffleStrokes(a, seededRandom(123)); shuffleStrokes(b, seededRandom(123)); shuffleStrokes(c, seededRandom(456));
    expect(a).toEqual(b); expect(a).not.toEqual(c);
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("leaves white and fully transparent images unpainted", () => {
    expect(paintSingleScale(source(5, 5, () => [255, 255, 255, 255]), painterlyDefaults).strokes).toEqual([]);
    expect(paintSingleScale(source(5, 5, () => [0, 0, 0, 0]), painterlyDefaults).strokes).toEqual([]);
    expect(paintSingleScale(source(), { ...painterlyDefaults, errorThreshold: MAX_RGB_ERROR }).strokes).toEqual([]);
  });

  it("derives distances from radius and rejects invalid settings before processing", () => {
    expect(resolvePainterlyParameters({ ...painterlyDefaults, brushRadius: 12 })).toMatchObject({ step: 12, gridSpacing: 12, sigma: 6 });
    expect(() => paintSingleScale(source(), { ...painterlyDefaults, minStrokeLength: 20 })).toThrow(/Minimum stroke length/);
    for (const [key, value] of Object.entries({ seed: -1, stepFactor: 0, gridFactor: NaN, directionSmoothing: 2, brushRadius: Infinity, maxStrokeLength: 2.5 })) {
      expect(() => paintSingleScale(source(), { ...painterlyDefaults, [key]: value })).toThrow();
    }
    expect(() => paintSingleScale(source(0, 0), painterlyDefaults)).toThrow(/nonempty/);
    expect(() => paintSingleScale(source(450, 450), { ...painterlyDefaults, brushRadius: 1 })).toThrow(/200,000 cells/);
  });

  it("registers only CPU and produces all advertised debug views without changing the painting", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const input = { source: { id: "test", name: "test", previewUrl: "", imageData: source() }, parameters: painterlyDefaults, methodId: "hertzmann" };
    const plain = await hertzmannCpuBackend.run({ ...input, debugEnabled: false });
    const debug = await hertzmannCpuBackend.run({ ...input, debugEnabled: true });
    expect(painterlyRenderingExperiment.metadata.id).toBe("painterly-rendering");
    expect(painterlyRenderingExperiment.methods[0].supportedBackends).toEqual(["cpu"]);
    expect(debug.output).toEqual(plain.output);
    expect(plain.debugViews).toBeUndefined();
    expect(debug.debugViews?.map(({ id }) => id)).toEqual(painterlyRenderingExperiment.methods[0].debugViews?.map(({ id }) => id));
    expect(debug.debugViews).toHaveLength(6);
    expect(debug.debugViews?.at(-1)?.result).toBe(debug.output);
    if (debug.output.kind !== "strokes") throw new Error("Expected strokes.");
    expect(debug.output.strokes.every((stroke) => stroke.width === 16 && stroke.opacity === 1)).toBe(true);
    expect(debug.output.background).toBe("#ffffff");
  });
});
