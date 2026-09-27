import { getAvgIntensity } from "../../localAverage";
import { createSeededRandom } from "../../random";
import type {
  IntensityImage,
  PoissonPoint,
  PoissonResult,
  StipplingParameters,
} from "../../types";

export function exclusionRadius(
  poissonRadius: number,
  averageIntensity: number,
  spacingMode: StipplingParameters["spacingMode"],
) {
  return spacingMode === "uniform"
    ? poissonRadius * 2
    : poissonRadius * (averageIntensity + 1);
}

export function distantEnough(
  x: number,
  y: number,
  candidateRadius: number,
  points: readonly PoissonPoint[],
) {
  for (const point of points) {
    const dx = x - point.x;
    const dy = y - point.y;
    const minimumDistance = candidateRadius + point.exclusionRadius;
    // Squaring both nonnegative distances avoids sqrt without changing the boundary.
    if (dx * dx + dy * dy < minimumDistance * minimumDistance) return false;
  }
  return true;
}

export function placePoissonStipples(
  intensity: IntensityImage,
  parameters: Pick<
    StipplingParameters,
    "seed" | "targetPoints" | "maxAttempts" | "poissonRadius" | "spacingMode"
  >,
  random = createSeededRandom(parameters.seed),
): PoissonResult {
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

  const points: PoissonPoint[] = [];
  let attempts = 0;
  while (points.length < targetPoints && attempts < maxAttempts) {
    const x = random() * intensity.width;
    const y = random() * intensity.height;
    const px = Math.round(x);
    const py = Math.round(y);
    const average = getAvgIntensity(intensity, px - 2, py - 2, px + 2, py + 2);
    attempts += 1;
    if (average > 0.95) continue;

    const radius = exclusionRadius(poissonRadius, average, spacingMode);
    if (distantEnough(x, y, radius, points)) {
      points.push({ x, y, exclusionRadius: radius });
    }
  }

  return {
    points,
    attempts,
    targetReached: points.length >= targetPoints,
    acceptanceRate: points.length / attempts,
  };
}
