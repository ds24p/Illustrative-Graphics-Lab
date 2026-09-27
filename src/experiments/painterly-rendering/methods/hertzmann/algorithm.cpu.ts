import { blurReference } from "../../blur";
import { computeErrorMap, selectStrokeSeeds } from "../../error";
import { sobelGradients } from "../../gradients";
import { sourceRgb, whiteCanvas } from "../../image";
import { resolvePainterlyParameters } from "../../parameters";
import { seededRandom, shuffleStrokes } from "../../random";
import { generateStroke } from "../../strokes";
import type { PainterlyParameters } from "../../types";

export function paintSingleScale(source: ImageData, parameters: PainterlyParameters) {
  const settings = resolvePainterlyParameters(parameters);
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
  const reference = stage("Blurred reference", () => blurReference(sourceRgb(source), settings.sigma));
  const field = stage("Sobel gradients", () => sobelGradients(reference));
  // One Hertzmann layer uses the pre-layer canvas snapshot for both seeding and termination.
  // All strokes are generated before shuffling and rendering; later layers will use the painted snapshot.
  const canvas = whiteCanvas(reference.width, reference.height);
  const errors = stage("Canvas error", () => computeErrorMap(reference, canvas));
  const seeds = stage("Grid seeds", () => selectStrokeSeeds(errors, reference.width, reference.height, settings.gridSpacing, settings.errorThreshold));
  if (seeds.length * (settings.maxStrokeLength + 1) > 2000000) {
    throw new Error("This run could exceed 2,000,000 stroke points. Increase Grid spacing, reduce Maximum stroke length, or use a smaller image.");
  }
  const strokes = stage("Curved strokes", () => {
    const random = seededRandom(settings.seed);
    const generated = seeds.map((seed) => generateStroke(seed, reference, canvas, field, {
      radius: settings.brushRadius,
      step: settings.step,
      minSegments: settings.minStrokeLength,
      maxSegments: settings.maxStrokeLength,
      smoothing: settings.directionSmoothing,
    }, random));
    // Separate stream: the drawing permutation does not depend on how many flat seeds consumed randomness.
    shuffleStrokes(generated, seededRandom(settings.seed ^ 0x9e3779b9));
    return generated;
  });
  return { reference, field, errors, seeds, strokes, settings, timings };
}

export type PainterlyRun = ReturnType<typeof paintSingleScale>;
