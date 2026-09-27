import type { PointResult } from "../../../../core/results/types";
import type { PlacementPoint } from "../../types";

export function toPointResult(
  points: readonly PlacementPoint[],
  width: number,
  height: number,
  dotSize: number,
): PointResult {
  return {
    kind: "points",
    width,
    height,
    background: "#fff",
    points: points.map(({ x, y }) => ({ x, y, radius: dotSize / 2, color: "#000" })),
  };
}
