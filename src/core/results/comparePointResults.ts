import type { ExperimentResult, PointResult } from "./types";

export interface PointDifference {
  firstCount: number;
  secondCount: number;
  pairedCount: number;
  meanDisplacement: number;
  maximumDisplacement: number;
  maximumIndex: number;
}

function requirePoints(result: ExperimentResult): PointResult {
  if (result.kind !== "points") throw new Error("Point comparison requires two point results.");
  return result;
}

// Ordered pairing is intentional: both Lloyd backends start from the same seeded sites.
export function comparePointResults(firstResult: ExperimentResult, secondResult: ExperimentResult): PointDifference {
  const first = requirePoints(firstResult).points;
  const second = requirePoints(secondResult).points;
  const pairedCount = Math.min(first.length, second.length);
  let total = 0;
  let maximumDisplacement = 0;
  let maximumIndex = -1;
  for (let index = 0; index < pairedCount; index += 1) {
    const displacement = Math.hypot(first[index].x - second[index].x, first[index].y - second[index].y);
    total += displacement;
    if (displacement > maximumDisplacement) {
      maximumDisplacement = displacement;
      maximumIndex = index;
    }
  }
  return {
    firstCount: first.length,
    secondCount: second.length,
    pairedCount,
    meanDisplacement: pairedCount ? total / pairedCount : 0,
    maximumDisplacement,
    maximumIndex,
  };
}
