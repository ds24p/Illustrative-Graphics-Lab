import { acceptsPlacementCandidate } from "../placement/algorithm.cpu";
import { getAvgIntensity } from "../../localAverage";
import { createSeededRandom } from "../../random";
import type { IntensityImage, PlacementPoint, StipplingParameters } from "../../types";

export interface LloydInitialization {
  points: PlacementPoint[];
  attempts: number;
  targetReached: boolean;
}

export function initializeLloydPoints(
  intensity: IntensityImage,
  parameters: Pick<StipplingParameters, "seed" | "initialPoints" | "maxAttempts">,
  random = createSeededRandom(parameters.seed),
): LloydInitialization {
  const { initialPoints, maxAttempts } = parameters;
  if (
    !Number.isInteger(initialPoints) || initialPoints < 1 ||
    !Number.isInteger(maxAttempts) || maxAttempts < 1
  ) {
    throw new Error("Initial Points and Max Attempts must be positive integers.");
  }
  if (intensity.width < 1 || intensity.height < 1) {
    throw new Error("Lloyd initialization needs a nonempty source image.");
  }

  const points: PlacementPoint[] = [];
  let attempts = 0;
  while (points.length < initialPoints && attempts < maxAttempts) {
    const x = random() * (intensity.width - 1);
    const y = random() * (intensity.height - 1);
    const px = Math.round(x);
    const py = Math.round(y);
    const average = getAvgIntensity(intensity, px - 2, py - 2, px + 2, py + 2);
    if (acceptsPlacementCandidate(average, random())) points.push({ x, y });
    attempts += 1;
  }

  return { points, attempts, targetReached: points.length >= initialPoints };
}
