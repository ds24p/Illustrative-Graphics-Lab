import { getAvgIntensity } from "../../localAverage";
import { createSeededRandom } from "../../random";
import type { HistoricalPoissonResult, IntensityImage, PoissonPoint, StipplingParameters } from "../../types";
import { exclusionRadius } from "./algorithm.cpu";

export function occupancyAllows(
  occupancy: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  const px = Math.round(x);
  const py = Math.round(y);
  // A rounded coordinate beyond the far edge is rejected, like the sketch's
  // non-white out-of-bounds get() result, rather than indexing another row.
  return px >= 0 && px < width && py >= 0 && py < height && occupancy[py * width + px] === 0;
}

export function paintOccupancyFootprint(
  occupancy: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  strokeWidth: number,
): void {
  const radius = strokeWidth / 2;
  const radiusSquared = radius * radius;
  const left = Math.max(0, Math.ceil(x - radius));
  const right = Math.min(width - 1, Math.floor(x + radius));
  const top = Math.max(0, Math.ceil(y - radius));
  const bottom = Math.min(height - 1, Math.floor(y + radius));

  // Deterministic binary approximation of Processing's round point stroke:
  // integer-indexed pixel centers inside the disk become occupied.
  for (let py = top; py <= bottom; py += 1) {
    for (let px = left; px <= right; px += 1) {
      const dx = px - x;
      const dy = py - y;
      if (dx * dx + dy * dy <= radiusSquared) occupancy[py * width + px] = 1;
    }
  }

  // Very narrow strokes can miss every sampled center; preserve the mark at
  // the rounded insertion location so that it cannot be inserted twice.
  const centerX = Math.round(x);
  const centerY = Math.round(y);
  if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
    occupancy[centerY * width + centerX] = 1;
  }
}

export function placeHistoricalPoissonStipples(
  intensity: IntensityImage,
  parameters: Pick<StipplingParameters, "seed" | "targetPoints" | "maxAttempts" | "poissonRadius" | "spacingMode">,
  random = createSeededRandom(parameters.seed),
): HistoricalPoissonResult {
  const { targetPoints, maxAttempts, poissonRadius, spacingMode } = parameters;
  if (
    !Number.isInteger(targetPoints) || targetPoints < 1 ||
    !Number.isInteger(maxAttempts) || maxAttempts < 1 ||
    !Number.isFinite(poissonRadius) || poissonRadius <= 0 ||
    (spacingMode !== "adaptive" && spacingMode !== "uniform")
  ) {
    throw new Error("Poisson counts and radius must be positive, with a valid spacing mode.");
  }
  if (intensity.width < 1 || intensity.height < 1) {
    throw new Error("Poisson stippling needs a nonempty source image.");
  }

  const occupancy = new Uint8Array(intensity.width * intensity.height);
  const points: PoissonPoint[] = [];
  let attempts = 0;
  while (points.length < targetPoints && attempts < maxAttempts) {
    const x = random() * intensity.width;
    const y = random() * intensity.height;
    const px = Math.round(x);
    const py = Math.round(y);
    const average = getAvgIntensity(intensity, px - 2, py - 2, px + 2, py + 2);
    attempts += 1;
    if (average > 0.95 || !occupancyAllows(occupancy, intensity.width, intensity.height, x, y)) continue;

    const radius = exclusionRadius(poissonRadius, average, spacingMode);
    points.push({ x, y, exclusionRadius: radius });
    paintOccupancyFootprint(occupancy, intensity.width, intensity.height, x, y, radius);
  }

  return {
    points,
    occupancy,
    attempts,
    targetReached: points.length >= targetPoints,
    acceptanceRate: points.length / attempts,
  };
}
