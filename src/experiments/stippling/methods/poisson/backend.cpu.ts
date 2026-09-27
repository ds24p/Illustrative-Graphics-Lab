import type { ExperimentBackend } from "../../../../core/backends/types";
import type { PointResult } from "../../../../core/results/types";
import { createProcessingIntensity } from "../../intensity";
import type { PoissonResult, StipplingParameters } from "../../types";
import { createPoissonDebugViews } from "./debug";
import { placePoissonStipples } from "./algorithm.cpu";
import { placeHistoricalPoissonStipples } from "./historical.cpu";

export const poissonCpuBackend: ExperimentBackend<StipplingParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    if (!Number.isFinite(parameters.dotSize) || parameters.dotSize <= 0) {
      throw new Error("Dot Size must be a positive number.");
    }

    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const poissonStartedAt = performance.now();
    const historical = parameters.spacingCheck === "historical-occupancy";
    if (!historical && parameters.spacingCheck !== "exact") {
      throw new Error("Unknown Poisson spacing check.");
    }
    let result: PoissonResult;
    let occupancy: Uint8Array | undefined;
    if (historical) {
      const historicalResult = placeHistoricalPoissonStipples(intensity, parameters);
      result = historicalResult;
      occupancy = historicalResult.occupancy;
    } else {
      result = placePoissonStipples(intensity, parameters);
    }
    const poissonMs = performance.now() - poissonStartedAt;

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
      ? createPoissonDebugViews(
          source.imageData, intensity, output, parameters.spacingMode,
          occupancy,
        )
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
        { label: "Spacing mode", value: parameters.spacingMode === "uniform" ? "Uniform" : "Adaptive" },
        { label: "Spacing check", value: historical ? "Historical Occupancy Buffer" : "Exact Distance" },
      ],
      stageTimings: {
        "Source brightness": preparationMs,
        [historical ? "Occupancy placement" : "Poisson placement"]: poissonMs,
        ...(debugEnabled ? { "Debug views": debugMs } : {}),
      },
    };
  },
};
