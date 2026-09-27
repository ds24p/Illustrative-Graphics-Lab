import type { ExperimentBackend } from "../../../../core/backends/types";
import type { RasterResult } from "../../../../core/results/types";
import { createProcessingIntensity } from "../../intensity";
import type { StipplingParameters } from "../../types";
import { stipplingWorkerClient } from "../../worker/client";
import { createLloydDebugViews } from "./debug";
import { toPointResult } from "./result";

export const lloydWorkerBackend: ExperimentBackend<StipplingParameters> = {
  id: "worker",
  checkAvailability: async () => ({
    available: typeof Worker !== "undefined",
    reason: typeof Worker === "undefined" ? "Web Workers are unavailable in this browser." : undefined,
  }),
  dispose: () => stipplingWorkerClient.dispose(),
  async run({ source, parameters, debugEnabled, signal }) {
    if (parameters.lloydMode !== "unweighted" && parameters.lloydMode !== "weighted") {
      throw new Error("Worker execution supports only sampled Lloyd strategies.");
    }
    if (!Number.isFinite(parameters.dotSize) || parameters.dotSize <= 0) {
      throw new Error("Dot Size must be a positive number.");
    }
    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const roundTripStartedAt = performance.now();
    const response = await stipplingWorkerClient.run({
      task: "lloyd-sampled", intensity, parameters, debugEnabled,
    }, signal);
    const roundTripMs = performance.now() - roundTripStartedAt;
    if (!response.ok || response.task !== "lloyd-sampled") throw new Error("Unexpected Lloyd Worker response.");
    const result = response.result;
    if (debugEnabled && !response.intensity) throw new Error("Lloyd Worker omitted debug brightness data.");

    const assemblyStartedAt = performance.now();
    const output = toPointResult(result.renderedPoints, source.imageData.width, source.imageData.height, parameters.dotSize);
    const precomputedOwnership: RasterResult | undefined = response.debugOwnership
      ? { kind: "raster", imageData: response.debugOwnership }
      : undefined;
    const debugViews = debugEnabled
      ? createLloydDebugViews(source.imageData, response.intensity!, result, output, parameters, precomputedOwnership)
      : undefined;
    const assemblyMs = performance.now() - assemblyStartedAt;

    return {
      output,
      debugViews,
      statistics: [
        { label: "Initial points accepted", value: result.initialPoints.length.toLocaleString() },
        { label: "Initialization attempts", value: result.initializationAttempts.toLocaleString() },
        { label: "Initial target reached", value: result.initializationTargetReached ? "Yes" : "No" },
        { label: "Iterations", value: String(parameters.iterations) },
        { label: "Final rendered points", value: result.renderedPoints.length.toLocaleString() },
        ...(parameters.iterations > 0 && parameters.lloydMode === "weighted" && parameters.removeNearWhite
          ? [{ label: "Filtered points", value: result.filteredPoints.toLocaleString() }] : []),
        { label: "Mode", value: parameters.lloydMode === "weighted" ? "Darkness-weighted" : "Unweighted" },
        { label: "Ownership strategy", value: "Sampled CPU" },
      ],
      stageTimings: {
        "Source brightness (main)": preparationMs,
        "Worker algorithm": response.algorithmMs,
        ...(debugEnabled ? { "Worker debug ownership": response.debugMs } : {}),
        "Worker transfer / scheduling": Math.max(0, roundTripMs - response.algorithmMs - response.debugMs),
        "Main result / debug assembly": assemblyMs,
      },
    };
  },
};
