import type { ExperimentBackend } from "../../../../core/backends/types";
import {
  binaryImageToRaster,
  createScreeningDebugViews,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { ScreeningParameters } from "../../types";
import { screenWithImageKernel } from "./algorithm.cpu";
import { resolveScreeningKernel } from "./kernel";

export const imageKernelCpuBackend: ExperimentBackend<ScreeningParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const kernel = await resolveScreeningKernel(parameters);
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = screenWithImageKernel(intensity, kernel, debugEnabled);
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = binaryImageToRaster(result.image);
    const debugViews =
      debugEnabled && result.debug
        ? createScreeningDebugViews(
            source.imageData,
            intensity,
            kernel,
            result.debug,
            output,
          )
        : undefined;
    const conversionMs = performance.now() - conversionStartedAt;

    return {
      output,
      debugViews,
      stageTimings: {
        "Kernel and source preparation": preparationMs,
        "Algorithm execution": algorithmMs,
        "Result conversion": conversionMs,
      },
    };
  },
};
