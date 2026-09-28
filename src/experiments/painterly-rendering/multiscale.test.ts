import { afterEach, describe, expect, it, vi } from "vitest";
import { createPainterlyDebugViews } from "./debug";
import { computeErrorMap, MAX_RGB_ERROR } from "./error";
import { sourceRgb } from "./image";
import { paintMultiScale, paintSingleScale, type PainterlyRun } from "./methods/hertzmann/algorithm.cpu";
import { painterlyDefaults, resolveBrushTexture, resolvePainterlyParameters, resolveScaleParameters } from "./parameters";
import { createTestPaintingSurface } from "./testSurface";
import type { PaintingSurfaceFactory } from "./types";

afterEach(() => vi.unstubAllGlobals());

function source(width = 32, height = 24, pixel = (x: number, y: number) => [x * 5, y * 5, 30, 255]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return { width, height, data } as ImageData;
}

describe("brush scale normalization and units", () => {
  it("requires a custom brush image only when the custom textured mode is selected", () => {
    expect(() => resolveBrushTexture({ ...painterlyDefaults, strokeRendering: "textured", brushType: "custom", customBrush: null })).toThrow(/Custom Brush/);
    expect(resolveBrushTexture({ ...painterlyDefaults, strokeRendering: "solid", brushType: "custom", customBrush: null })).toBeUndefined();
  });
  it.each(["16,8,4", "4,16,8,4", "8 4 16 8"])("normalizes %s to descending unique radii", (brushSizes) => {
    expect(resolvePainterlyParameters({ ...painterlyDefaults, brushSizes }).brushRadii).toEqual([16, 8, 4]);
  });

  it.each(["", "0", "-2", "65", "2.5", "NaN", "Infinity", "8,cat", "1,2,3,4,5,6,7,8,9"])("rejects invalid radii: %s", (brushSizes) => {
    expect(() => resolvePainterlyParameters({ ...painterlyDefaults, brushSizes })).toThrow(/Brush Sizes/);
  });

  it("derives blur, step, grid and physical stroke reach from radius", () => {
    for (const radius of [16, 8, 4]) {
      const settings = resolveScaleParameters(painterlyDefaults, radius);
      expect(settings.sigma).toBe(radius * 0.5);
      expect(settings.step).toBe(radius);
      expect(settings.gridSpacing).toBe(radius);
      expect(settings.minStrokeLength * settings.step).toBe(4 * radius);
      expect(settings.maxStrokeLength * settings.step).toBe(16 * radius);
    }
    const settings = resolveScaleParameters({ ...painterlyDefaults, distanceMode: "pixels", stepPixels: 3, gridPixels: 5 }, 16);
    expect(settings).toMatchObject({ step: 3, gridSpacing: 5, sigma: 8 });
  });
});

describe("painting feedback between scales", () => {
  it("propagates opacity, reports approximate pixel length, and feeds composited pixels forward", async () => {
    const image = source(16, 16, (x, y) => [x < 8 ? 0 : 220, y * 4, 40, 255]);
    const snapshots: ImageData[] = [];
    const opacities: number[] = [];
    const createSurface: PaintingSurfaceFactory = (width, height) => {
      const data = new Uint8ClampedArray(width * height * 4).fill(255);
      for (let i = 3; i < data.length; i += 4) data[i] = 255;
      return {
        snapshot: () => {
          const imageData = { width, height, data: data.slice() } as ImageData;
          snapshots.push(imageData);
          return imageData;
        },
        drawLayer(strokes) {
          for (const stroke of strokes) {
            opacities.push(stroke.opacity);
            const point = stroke.points[0];
            const i = (Math.floor(point.y) * width + Math.floor(point.x)) * 4;
            const alpha = stroke.opacity;
            data[i] = data[i] * (1 - alpha) + stroke.color.r * alpha;
            data[i + 1] = data[i + 1] * (1 - alpha) + stroke.color.g * alpha;
            data[i + 2] = data[i + 2] * (1 - alpha) + stroke.color.b * alpha;
          }
        },
      };
    };
    const layers: PainterlyRun[] = [];
    const run = await paintMultiScale(image, { ...painterlyDefaults, brushSizes: "8,4", strokeOpacity: 0.5 }, createSurface,
      (layer) => layers.push(layer));
    expect(opacities.length).toBeGreaterThan(0);
    expect(opacities.every((opacity) => opacity === 0.5)).toBe(true);
    expect(run.layers.every((layer) => layer.averagePixelLength === layer.averageSegments * layer.step)).toBe(true);
    expect(snapshots.length).toBe(3);
    expect(layers[1].errors).toEqual(computeErrorMap(layers[1].reference, sourceRgb(snapshots[1])));
  });

  it("executes normalized order and exactly reproduces single-layer geometry", async () => {
    const image = source();
    const order: number[] = [];
    const run = await paintMultiScale(image, { ...painterlyDefaults, brushSizes: "4,16,8,16" }, createTestPaintingSurface,
      (layer) => order.push(layer.settings.brushRadius));
    expect(order).toEqual([16, 8, 4]);
    expect(run.layers.map((layer) => layer.radius)).toEqual(order);
    const singleParameters = { ...painterlyDefaults, brushSizes: "8" };
    const single = await paintMultiScale(image, singleParameters, createTestPaintingSurface);
    expect(single.strokes).toEqual(paintSingleScale(image, singleParameters).strokes);
  });

  it("computes each error map against the actual previous canvas and retains that canvas", async () => {
    const image = source(16, 16, () => [0, 0, 0, 255]);
    let factoryCalls = 0;
    let drawCalls = 0;
    // Scripted renderer paints the left half first. Afterward only the right half needs repair.
    const createSurface: PaintingSurfaceFactory = (width, height) => {
      factoryCalls++;
      const data = new Uint8ClampedArray(width * height * 4).fill(255);
      return {
        snapshot: () => ({ width, height, data: data.slice() }) as ImageData,
        drawLayer() {
          drawCalls++;
          for (let y = 0; y < height; y++) for (let x = 0; x < (drawCalls === 1 ? width / 2 : width); x++) {
            const i = (y * width + x) * 4;
            data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
          }
        },
      };
    };
    const layers: PainterlyRun[] = [];
    const snapshots: ImageData[] = [];
    await paintMultiScale(image, painterlyDefaults, createSurface, (layer, canvas) => { layers.push(layer); snapshots.push(canvas); });
    expect(factoryCalls).toBe(1);
    expect(drawCalls).toBe(3);
    expect(layers[0].errors.every((error) => error === MAX_RGB_ERROR)).toBe(true);
    expect(layers[1].errors).toEqual(computeErrorMap(layers[1].reference, sourceRgb(snapshots[0])));
    expect(layers[2].errors).toEqual(computeErrorMap(layers[2].reference, sourceRgb(snapshots[1])));
    expect(layers[1].seeds.length).toBeGreaterThan(0);
    expect(layers[1].seeds.every((seed) => seed.x >= 8)).toBe(true);
    expect(layers[1].errors[0]).toBe(0);
    expect(layers[2].strokes).toEqual([]);
    // Later layers did not mutate earlier diagnostic snapshots.
    expect(snapshots[0].data[(15 * 16 + 15) * 4]).toBe(255);
    expect(snapshots[2].data[(15 * 16 + 15) * 4]).toBe(0);
  });

  it("is deterministic, keeps earlier layers unchanged, and never mutates the source", async () => {
    const image = source();
    const saved = image.data.slice();
    const a = await paintMultiScale(image, painterlyDefaults, createTestPaintingSurface);
    const b = await paintMultiScale(image, painterlyDefaults, createTestPaintingSurface);
    expect(a.strokes).toEqual(b.strokes);
    const coarse = await paintMultiScale(image, { ...painterlyDefaults, brushSizes: "16" }, createTestPaintingSurface);
    expect(a.strokes.slice(0, coarse.strokes.length)).toEqual(coarse.strokes);
    const changed = await paintMultiScale(image, { ...painterlyDefaults, seed: 41 }, createTestPaintingSurface);
    expect(changed.strokes).not.toEqual(a.strokes);
    expect(image.data).toEqual(saved);
  });

  it.each([[1, 1], [1, 9], [9, 1], [32, 24]])("has finite fields and in-bounds points for flat %ix%i sources", async (width, height) => {
    await paintMultiScale(source(width, height, () => [0, 0, 0, 255]), painterlyDefaults, createTestPaintingSurface, (layer) => {
      for (const values of [layer.field.gx, layer.field.gy, layer.field.magnitude]) expect(values.every(Number.isFinite)).toBe(true);
      for (const stroke of layer.strokes) for (const point of stroke.points) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(0.5); expect(point.x).toBeLessThanOrEqual(width - 0.5);
        expect(point.y).toBeGreaterThanOrEqual(0.5); expect(point.y).toBeLessThanOrEqual(height - 0.5);
      }
    });
  });

  it("matches debug data and statistics to the correct radius without changing output", async () => {
    vi.stubGlobal("ImageData", class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} });
    const image = source();
    const views = new Map<number, ReturnType<typeof createPainterlyDebugViews>>();
    const debug = await paintMultiScale(image, painterlyDefaults, createTestPaintingSurface, (layer, canvas) => {
      const radius = layer.settings.brushRadius;
      const currentViews = createPainterlyDebugViews(layer, canvas);
      views.set(radius, currentViews);
      expect(currentViews).toHaveLength(9);
      expect(currentViews.every((view) => view.group === `${radius} px` && view.id.startsWith(`${radius}-`))).toBe(true);
      const layerOnly = currentViews.find((view) => view.definitionId === "layer-strokes-only")!.result;
      if (layerOnly.kind !== "strokes") throw new Error("Expected stroke result.");
      expect(layerOnly.strokes).toHaveLength(layer.strokes.length);
      expect(layerOnly.strokes.every((stroke) => stroke.width === radius * 2)).toBe(true);
      const after = currentViews.find((view) => view.definitionId === "canvas-after-layer")!.result;
      if (after.kind !== "raster") throw new Error("Expected raster snapshot.");
      expect(after.imageData).toBe(canvas);
      const paths = currentViews.find((view) => view.definitionId === "stroke-paths")!.result;
      if (paths.kind !== "paths") throw new Error("Expected path result.");
      expect(paths.paths.length).toBe(layer.strokes.length * 2);
      expect(paths.paths[0]?.points).toEqual(layer.strokes[0]?.points ?? []);
    });
    const plain = await paintMultiScale(image, painterlyDefaults, createTestPaintingSurface);
    expect(debug.strokes).toEqual(plain.strokes);
    expect([...views.keys()]).toEqual([16, 8, 4]);
    expect(debug.layers.reduce((sum, layer) => sum + layer.strokeCount, 0)).toBe(debug.strokes.length);
    expect(debug.layers.every((layer) => Number.isFinite(layer.averageSegments) && layer.processingMs >= 0)).toBe(true);
  });

  it("honors cancellation between scales", async () => {
    const controller = new AbortController();
    const seen: number[] = [];
    await expect(paintMultiScale(source(), painterlyDefaults, createTestPaintingSurface, (layer) => {
      seen.push(layer.settings.brushRadius); controller.abort();
    }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(seen).toEqual([16]);
  });
});
