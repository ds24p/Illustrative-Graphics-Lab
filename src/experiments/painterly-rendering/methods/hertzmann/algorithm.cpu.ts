import { blurReference } from "../../blur";
import { computeErrorMap, selectStrokeSeeds } from "../../error";
import { sobelGradients } from "../../gradients";
import { sourceRgb, whiteCanvas } from "../../image";
import { resolvePainterlyParameters, resolveScaleParameters } from "../../parameters";
import { seededRandom, shuffleStrokes } from "../../random";
import { generateStroke } from "../../strokes";
import type { PainterlyParameters, PainterlyStroke, PaintingSurfaceFactory, RgbImage } from "../../types";

export function paintSingleScale(source: ImageData, parameters: PainterlyParameters) {
  const parametersResolved = resolvePainterlyParameters(parameters);
  if (parametersResolved.brushRadii.length !== 1) throw new Error("Single-scale generation requires exactly one brush radius.");
  const settings = resolveScaleParameters(parameters, parametersResolved.brushRadii[0]);
  return generatePainterlyLayer(sourceRgb(source), whiteCanvas(source.width, source.height), settings);
}

// This remains a pure layer generator. It neither draws nor modifies its canvas snapshot.
export function generatePainterlyLayer(source: RgbImage, canvas: RgbImage, settings: ReturnType<typeof resolveScaleParameters>, usedPoints = 0) {
  const timings: Record<string, number> = {};
  function stage<T>(label: string, work: () => T) {
    const start = performance.now();
    const result = work();
    timings[label] = performance.now() - start;
    return result;
  }
  // Bound worst-case allocations for small grids on large uploads. Never silently rescale or truncate.
  const cells = Math.ceil(source.width / settings.gridSpacing) * Math.ceil(source.height / settings.gridSpacing);
  if (cells > 200000) throw new Error("This image and grid exceed 200,000 cells. Increase Grid spacing or Brush radius, or use a smaller image.");
  const reference = stage("Blurred reference", () => blurReference(source, settings.sigma));
  const field = stage("Sobel gradients", () => sobelGradients(reference));
  // One Hertzmann layer uses the pre-layer canvas snapshot for both seeding and termination.
  // All strokes are generated before shuffling and rendering.
  const errors = stage("Canvas error", () => computeErrorMap(reference, canvas));
  const seeds = stage("Grid seeds", () => selectStrokeSeeds(errors, reference.width, reference.height, settings.gridSpacing, settings.errorThreshold));
  if (usedPoints + seeds.length * (settings.maxStrokeLength + 1) > 2000000) {
    throw new Error("This run could exceed 2,000,000 stroke points. Increase Grid spacing, reduce Maximum stroke length, or use a smaller image.");
  }
  const strokes = stage("Curved strokes", () => {
    const random = seededRandom(settings.seed);
    const generated = seeds.map((seed) => generateStroke(seed, reference, canvas, field, {
      radius: settings.brushRadius,
      step: settings.step,
      minSegments: settings.minStrokeLength,
      maxSegments: settings.maxStrokeLength,
      directionFollowing: settings.directionFollowing,
      opacity: settings.strokeOpacity,
      colorJitter: settings.colorJitter,
    }, random));
    // Separate stream: the drawing permutation does not depend on how many flat seeds consumed randomness.
    shuffleStrokes(generated, seededRandom(settings.seed ^ 0x9e3779b9));
    return generated;
  });
  return { reference, field, errors, seeds, strokes, settings, timings };
}

export type PainterlyRun = ReturnType<typeof paintSingleScale>;

export interface LayerStatistics {
  radius: number;
  strokeCount: number;
  averageSegments: number;
  averagePixelLength: number;
  sigma: number;
  gridSpacing: number;
  step: number;
  processingMs: number;
}

export async function paintMultiScale(
  source: ImageData,
  parameters: PainterlyParameters,
  createSurface: PaintingSurfaceFactory,
  onLayer?: (layer: PainterlyRun, canvasAfter: ImageData) => void,
  signal?: AbortSignal,
) {
  const { brushRadii } = resolvePainterlyParameters(parameters);
  signal?.throwIfAborted();
  const startedAt = performance.now();
  const original = sourceRgb(source);
  // One surface, initialized once. This factory is the only rendering dependency.
  const surface = createSurface(original.width, original.height);
  let canvas = sourceRgb(surface.snapshot());
  let usedPoints = 0;
  let debugMs = 0;
  const strokes: PainterlyStroke[] = [];
  const layers: LayerStatistics[] = [];
  const stageTimings: Record<string, number> = {};
  for (const radius of brushRadii) {
    signal?.throwIfAborted();
    const layerStart = performance.now();
    const settings = resolveScaleParameters(parameters, radius);
    const layer = generatePainterlyLayer(original, canvas, settings, usedPoints);
    surface.drawLayer(layer.strokes);
    const canvasAfter = surface.snapshot();
    // Read the actual curved, antialiased brush marks before selecting the next layer's seeds.
    canvas = sourceRgb(canvasAfter);
    const processingMs = performance.now() - layerStart;
    let segments = 0;
    for (const stroke of layer.strokes) {
      strokes.push(stroke);
      usedPoints += stroke.points.length;
      segments += stroke.points.length - 1;
    }
    layers.push({ radius, strokeCount: layer.strokes.length,
      averageSegments: layer.strokes.length ? segments / layer.strokes.length : 0,
      averagePixelLength: layer.strokes.length ? segments * settings.step / layer.strokes.length : 0,
      sigma: settings.sigma, gridSpacing: settings.gridSpacing, step: settings.step, processingMs });
    stageTimings[`Layer ${radius} px (including painting)`] = processingMs;
    if (onLayer) {
      const debugStart = performance.now();
      onLayer(layer, canvasAfter);
      debugMs += performance.now() - debugStart;
    }
    // Let navigation/cancellation run between layers, without introducing a new execution backend.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  signal?.throwIfAborted();
  if (onLayer) stageTimings["Debug views"] = debugMs;
  return { strokes, layers, stageTimings, totalMs: performance.now() - startedAt, brushRadii };
}
