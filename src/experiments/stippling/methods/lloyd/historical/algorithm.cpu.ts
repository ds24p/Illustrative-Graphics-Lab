import type { IntensityImage, PlacementPoint, StipplingParameters } from "../../../types";
import { keepBelowWhiteCutoff, type LloydResult } from "../algorithm.cpu";
import { initializeLloydPoints } from "../initialization";
import { renderConeOwnership, type ConeOwnership } from "./coneRaster";

export function historicalBorderBounds(dimension: number): [number, number] {
  return dimension > 40 ? [20, dimension - 20] : [0, dimension - 1];
}

export function moveHistoricalPoints(
  points: readonly PlacementPoint[],
  intensity: IntensityImage,
  ownership: ConeOwnership,
): PlacementPoint[] {
  if (ownership.width !== intensity.width || ownership.height !== intensity.height) {
    throw new Error("Cone ownership must match the source dimensions.");
  }
  const sumX = new Float64Array(points.length);
  const sumY = new Float64Array(points.length);
  const sumWeight = new Float64Array(points.length);
  for (let y = 0; y < intensity.height; y += 1) {
    for (let x = 0; x < intensity.width; x += 1) {
      const pixel = y * intensity.width + x;
      const owner = ownership.owners[pixel];
      if (owner < 0 || owner >= points.length) continue;
      const weight = 1 - intensity.values[pixel];
      sumX[owner] += x * weight;
      sumY[owner] += y * weight;
      sumWeight[owner] += weight;
    }
  }

  const [minX, maxX] = historicalBorderBounds(intensity.width);
  const [minY, maxY] = historicalBorderBounds(intensity.height);
  return points.map((point, index) => {
    // The Processing sketch divides by zero here. Preserve the site instead
    // of allowing NaN/Infinity to poison the next cone pass.
    if (sumWeight[index] <= 0) return { ...point };
    return {
      x: Math.max(minX, Math.min(maxX, sumX[index] / sumWeight[index])),
      y: Math.max(minY, Math.min(maxY, sumY[index] / sumWeight[index])),
    };
  });
}

export interface HistoricalLloydResult extends LloydResult {
  ownership?: ConeOwnership;
}

export function relaxHistoricalLloyd(
  intensity: IntensityImage,
  parameters: Pick<StipplingParameters, "seed" | "initialPoints" | "maxAttempts" | "iterations" | "removeNearWhite">,
): HistoricalLloydResult {
  if (!Number.isInteger(parameters.iterations) || parameters.iterations < 0) {
    throw new Error("Iterations must be a nonnegative integer.");
  }
  const initialization = initializeLloydPoints(intensity, parameters);
  let current = initialization.points;
  let beforeFinalIteration = current;
  let ownership: ConeOwnership | undefined;
  for (let iteration = 0; iteration < parameters.iterations; iteration += 1) {
    if (iteration === parameters.iterations - 1) beforeFinalIteration = current;
    ownership = renderConeOwnership(current, intensity.width, intensity.height);
    current = moveHistoricalPoints(current, intensity, ownership);
  }

  const renderedPoints = parameters.iterations > 0 && parameters.removeNearWhite
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
    ownership,
  };
}
