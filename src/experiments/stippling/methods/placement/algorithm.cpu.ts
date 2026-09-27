import { getAvgIntensity } from "../../localAverage";
import { createSeededRandom } from "../../random";
import type {
  IntensityImage,
  PlacementResult,
  StipplingParameters,
} from "../../types";

export function acceptsPlacementCandidate(intensity: number, randomValue: number) {
  return randomValue > intensity;
}

export function placeStipples(
  intensity: IntensityImage,
  parameters: Pick<
    StipplingParameters,
    "seed" | "targetPoints" | "maxAttempts" | "intensityWindow"
  >,
  random = createSeededRandom(parameters.seed),
): PlacementResult {
  const { targetPoints, maxAttempts, intensityWindow } = parameters;
  if (
    !Number.isInteger(targetPoints) || targetPoints < 1 ||
    !Number.isInteger(maxAttempts) || maxAttempts < 1 ||
    !Number.isInteger(intensityWindow) || intensityWindow < 1
  ) {
    throw new Error("Placement counts and intensity window must be positive integers.");
  }
  if (intensity.width < 1 || intensity.height < 1) {
    throw new Error("Placement needs a nonempty source image.");
  }

  const points: PlacementResult["points"] = [];
  let attempts = 0;
  while (points.length < targetPoints && attempts < maxAttempts) {
    const x = random() * intensity.width;
    const y = random() * intensity.height;
    const px = Math.round(x);
    const py = Math.round(y);
    const average = getAvgIntensity(
      intensity,
      px - intensityWindow,
      py - intensityWindow,
      px + intensityWindow,
      py + intensityWindow,
    );
    if (acceptsPlacementCandidate(average, random())) {
      points.push({ x, y });
    }
    attempts += 1;
  }

  return {
    points,
    attempts,
    targetReached: points.length >= targetPoints,
    acceptanceRate: points.length / attempts,
  };
}
