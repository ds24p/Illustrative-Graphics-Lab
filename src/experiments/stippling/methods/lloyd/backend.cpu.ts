import type { ExperimentBackend } from "../../../../core/backends/types";
import { createProcessingIntensity } from "../../intensity";
import type { StipplingParameters } from "../../types";
import { relaxLloyd } from "./algorithm.cpu";
import { createLloydDebugViews } from "./debug";
import { relaxHistoricalLloyd } from "./historical/algorithm.cpu";
import { createHistoricalLloydDebugViews } from "./historical/debug";
import { toPointResult } from "./result";

export const lloydCpuBackend: ExperimentBackend<StipplingParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    if (!Number.isFinite(parameters.dotSize) || parameters.dotSize <= 0) {
      throw new Error("Dot Size must be a positive number.");
    }

    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const relaxationStartedAt = performance.now();
    const historical = parameters.lloydMode === "historical-cone";
    const result = historical
      ? relaxHistoricalLloyd(intensity, parameters)
      : relaxLloyd(intensity, parameters);
    const relaxationMs = performance.now() - relaxationStartedAt;
    const output = toPointResult(result.renderedPoints, intensity.width, intensity.height, parameters.dotSize);

    const debugStartedAt = performance.now();
    const debugViews = debugEnabled
      ? historical
        ? createHistoricalLloydDebugViews(source.imageData, intensity, result, output, parameters.dotSize, parameters.iterations)
        : createLloydDebugViews(source.imageData, intensity, result, output, parameters)
      : undefined;
    const debugMs = performance.now() - debugStartedAt;

    return {
      output,
      debugViews,
      statistics: [
        { label: "Initial points accepted", value: result.initialPoints.length.toLocaleString() },
        { label: "Initialization attempts", value: result.initializationAttempts.toLocaleString() },
        { label: "Initial target reached", value: result.initializationTargetReached ? "Yes" : "No" },
        { label: "Iterations", value: String(parameters.iterations) },
        { label: "Final rendered points", value: result.renderedPoints.length.toLocaleString() },
        ...(parameters.iterations > 0 && parameters.lloydMode !== "unweighted" && parameters.removeNearWhite
          ? [{ label: "Filtered points", value: result.filteredPoints.toLocaleString() }] : []),
        { label: "Mode", value: parameters.lloydMode === "unweighted" ? "Unweighted" : "Darkness-weighted" },
        { label: "Ownership strategy", value: historical ? "Historical Cone Rasterization" : "Sampled CPU" },
      ],
      stageTimings: {
        "Source brightness": preparationMs,
        [historical ? "Initialization and cone iterations" : "Initialization and relaxation"]: relaxationMs,
        ...(debugEnabled ? { "Debug views": debugMs } : {}),
      },
    };
  },
};
