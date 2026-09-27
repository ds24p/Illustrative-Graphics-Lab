import type { ExperimentBackend } from "../../../../core/backends/types";
import type { PointResult } from "../../../../core/results/types";
import { createPlacementDebugViews } from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { StipplingParameters } from "../../types";
import { placeStipples } from "./algorithm.cpu";

export const placementCpuBackend: ExperimentBackend<StipplingParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    if (!Number.isFinite(parameters.dotSize) || parameters.dotSize <= 0) {
      throw new Error("Dot Size must be a positive number.");
    }

    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const placementStartedAt = performance.now();
    const result = placeStipples(intensity, parameters);
    const placementMs = performance.now() - placementStartedAt;

    const output: PointResult = {
      kind: "points",
      width: intensity.width,
      height: intensity.height,
      background: "#fff",
      points: result.points.map(({ x, y }) => ({
        x,
        y,
        radius: parameters.dotSize / 2,
        color: "#000",
      })),
    };

    const debugStartedAt = performance.now();
    const debugViews = debugEnabled
      ? createPlacementDebugViews(source.imageData, intensity, output)
      : undefined;
    const debugMs = performance.now() - debugStartedAt;

    return {
      output,
      debugViews,
      statistics: [
        { label: "Accepted points", value: result.points.length.toLocaleString() },
        { label: "Attempts", value: result.attempts.toLocaleString() },
        { label: "Target reached", value: result.targetReached ? "Yes" : "No" },
        { label: "Acceptance rate", value: `${(result.acceptanceRate * 100).toFixed(1)}%` },
      ],
      stageTimings: {
        "Source brightness": preparationMs,
        "Point placement": placementMs,
        ...(debugEnabled ? { "Debug views": debugMs } : {}),
      },
    };
  },
};
