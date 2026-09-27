import type { IntensityImage, PlacementPoint, StipplingParameters } from "../../types";
import { initializeLloydPoints } from "./initialization";

export const SAMPLE_STEP = 3;
export const WHITE_CUTOFF = Math.fround(0.95);

export function nearestSiteIndex(x: number, y: number, points: readonly PlacementPoint[]) {
  let nearest = -1;
  let minimumSquaredDistance = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const dx = x - points[index].x;
    const dy = y - points[index].y;
    const squaredDistance = dx * dx + dy * dy;
    if (squaredDistance < minimumSquaredDistance) {
      minimumSquaredDistance = squaredDistance;
      nearest = index;
    }
  }
  return nearest;
}

export function lloydIteration(
  points: readonly PlacementPoint[],
  intensity: IntensityImage,
  mode: StipplingParameters["lloydMode"],
): PlacementPoint[] {
  if (mode !== "unweighted" && mode !== "weighted") {
    throw new Error("Lloyd mode must be Unweighted or Darkness-weighted.");
  }
  if (points.length === 0) return [];

  const sumX = new Float64Array(points.length);
  const sumY = new Float64Array(points.length);
  const sumWeight = new Float64Array(points.length);
  for (let y = 0; y < intensity.height; y += SAMPLE_STEP) {
    for (let x = 0; x < intensity.width; x += SAMPLE_STEP) {
      const owner = nearestSiteIndex(x, y, points);
      const weight = mode === "weighted" ? 1 - intensity.values[y * intensity.width + x] : 1;
      sumX[owner] += x * weight;
      sumY[owner] += y * weight;
      sumWeight[owner] += weight;
    }
  }

  return points.map((point, index) => sumWeight[index] > 0
    ? { x: sumX[index] / sumWeight[index], y: sumY[index] / sumWeight[index] }
    : { ...point });
}

export function keepBelowWhiteCutoff(point: PlacementPoint, intensity: IntensityImage) {
  // Slow-mode centroids stay inside the image; clamp only the integer lookup as a safety net.
  const x = Math.max(0, Math.min(intensity.width - 1, Math.trunc(point.x)));
  const y = Math.max(0, Math.min(intensity.height - 1, Math.trunc(point.y)));
  return intensity.values[y * intensity.width + x] < WHITE_CUTOFF;
}

export interface LloydResult {
  initialPoints: PlacementPoint[];
  initializationAttempts: number;
  initializationTargetReached: boolean;
  beforeFinalIteration: PlacementPoint[];
  finalPoints: PlacementPoint[];
  renderedPoints: PlacementPoint[];
  filteredPoints: number;
}

export function relaxLloyd(
  intensity: IntensityImage,
  parameters: Pick<
    StipplingParameters,
    "seed" | "initialPoints" | "maxAttempts" | "iterations" | "lloydMode" | "removeNearWhite"
  >,
): LloydResult {
  if (!Number.isInteger(parameters.iterations) || parameters.iterations < 0) {
    throw new Error("Iterations must be a nonnegative integer.");
  }
  const initialization = initializeLloydPoints(intensity, parameters);
  let current = initialization.points;
  let beforeFinalIteration = current;
  for (let iteration = 0; iteration < parameters.iterations; iteration += 1) {
    if (iteration === parameters.iterations - 1) beforeFinalIteration = current;
    current = lloydIteration(current, intensity, parameters.lloydMode);
  }

  const renderedPoints = parameters.iterations > 0 &&
    parameters.lloydMode === "weighted" && parameters.removeNearWhite
    ? current.filter((point) => keepBelowWhiteCutoff(point, intensity))
    : current;

  return {
    initialPoints: initialization.points,
    initializationAttempts: initialization.attempts,
    initializationTargetReached: initialization.targetReached,
    beforeFinalIteration,
    finalPoints: current,
    renderedPoints,
    filteredPoints: current.length - renderedPoints.length,
  };
}
