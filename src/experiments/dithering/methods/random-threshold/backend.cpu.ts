import type { ExperimentBackend } from "../../../../core/backends/types";
import type { DebugView } from "../../../../core/results/types";
import {
  binaryImageToRaster,
  createDitheringDebugViews,
  scalarImageToRaster,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { DitheringParameters } from "../../types";
import { ditherRandomThreshold } from "./algorithm.cpu";

export const randomThresholdCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = ditherRandomThreshold(
      intensity,
      parameters.threshold,
      parameters.randomAmplitude,
      parameters.randomSeed,
      debugEnabled,
    );
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = binaryImageToRaster(result.image);
    const methodViews: DebugView[] = result.randomThresholds
      ? [
          {
            id: "random-threshold-map",
            label: "Random threshold map",
            result: scalarImageToRaster(
              result.randomThresholds,
              intensity.width,
              intensity.height,
            ),
          },
        ]
      : [];

    const debugViews = debugEnabled
      ? createDitheringDebugViews(
          source.imageData,
          intensity,
          output,
          methodViews,
        )
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
