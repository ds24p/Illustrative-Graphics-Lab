import type { ExperimentBackend } from "../../../../core/backends/types";
import type { PointResult } from "../../../../core/results/types";
import { createProcessingIntensity } from "../../intensity";
import type { StipplingParameters } from "../../types";
import { stipplingWorkerClient } from "../../worker/client";
import { createPoissonDebugViews } from "./debug";

export const poissonWorkerBackend: ExperimentBackend<StipplingParameters> = {
  id: "worker",
  checkAvailability: async () => ({
    available: typeof Worker !== "undefined",
    reason: typeof Worker === "undefined" ? "Web Workers are unavailable in this browser." : undefined,
  }),
  dispose: () => stipplingWorkerClient.dispose(),
  async run({ source, parameters, debugEnabled, signal }) {
    if (parameters.spacingCheck !== "exact") {
      throw new Error("Worker execution supports only Exact Distance Poisson.");
    }
    if (!Number.isFinite(parameters.dotSize) || parameters.dotSize <= 0) {
      throw new Error("Dot Size must be a positive number.");
    }
    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const roundTripStartedAt = performance.now();
    const response = await stipplingWorkerClient.run({
      task: "poisson-exact", intensity, parameters, debugEnabled,
    }, signal);
    const roundTripMs = performance.now() - roundTripStartedAt;
    if (!response.ok || response.task !== "poisson-exact") throw new Error("Unexpected Poisson Worker response.");
    const result = response.result;
    if (debugEnabled && !response.intensity) throw new Error("Poisson Worker omitted debug brightness data.");

    const assemblyStartedAt = performance.now();
    const output: PointResult = {
      kind: "points",
      width: source.imageData.width,
      height: source.imageData.height,
      background: "#fff",
      points: result.points.map(({ x, y }) => ({
        x, y, radius: parameters.dotSize / 2, color: "#000",
      })),
    };
    const debugViews = debugEnabled
      ? createPoissonDebugViews(source.imageData, response.intensity!, output, parameters.spacingMode)
      : undefined;
    const assemblyMs = performance.now() - assemblyStartedAt;

    return {
      output,
      debugViews,
      statistics: [
        { label: "Accepted points", value: result.points.length.toLocaleString() },
        { label: "Attempts", value: result.attempts.toLocaleString() },
        { label: "Target reached", value: result.targetReached ? "Yes" : "No" },
        { label: "Acceptance rate", value: `${(result.acceptanceRate * 100).toFixed(1)}%` },
        { label: "Spacing mode", value: parameters.spacingMode === "uniform" ? "Uniform" : "Adaptive" },
        { label: "Spacing check", value: "Exact Distance" },
      ],
      stageTimings: {
        "Source brightness (main)": preparationMs,
        "Worker algorithm": response.algorithmMs,
        "Worker transfer / scheduling": Math.max(0, roundTripMs - response.algorithmMs),
        "Main result / debug assembly": assemblyMs,
      },
    };
  },
};
