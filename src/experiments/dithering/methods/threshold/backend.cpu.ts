import type { ExperimentBackend } from "../../../../core/backends/types";
import {
  binaryImageToRaster,
  createDitheringDebugViews,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { DitheringParameters } from "../../types";
import { ditherThreshold } from "./algorithm.cpu";

export const thresholdCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = ditherThreshold(intensity, parameters.threshold);
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = binaryImageToRaster(result.image);
    const debugViews = debugEnabled
      ? createDitheringDebugViews(source.imageData, intensity, output)
      : undefined;
    const conversionMs = performance.now() - conversionStartedAt;

    return {
      output,
      debugViews,
      stageTimings: {
        "Input preparation": preparationMs,
        "Algorithm execution": algorithmMs,
        "Result conversion": conversionMs,
      },
    };
  },
};
