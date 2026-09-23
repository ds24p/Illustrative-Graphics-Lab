import type { ExperimentBackend } from "../../../../core/backends/types";
import type { ScreeningParameters } from "../../types";
import { screenCmykClusteredDot } from "./algorithm.cpu";
import {
  cmykImageToRaster,
  createCmykDebugViews,
} from "./debug";
import { createCmykScreeningOptions } from "./options";

export const cmykClusteredDotCpuBackend: ExperimentBackend<ScreeningParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const options = createCmykScreeningOptions(parameters);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = screenCmykClusteredDot(
      source.imageData,
      options,
      debugEnabled,
    );
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = cmykImageToRaster(result.image);
    const debugViews =
      debugEnabled && result.debug
        ? createCmykDebugViews(source.imageData, result.debug, output)
        : undefined;
    const conversionMs = performance.now() - conversionStartedAt;

    return {
      output,
      debugViews,
      stageTimings: {
        "CMYK parameter preparation": preparationMs,
        "CMYK clustered-dot screening": algorithmMs,
        "Result and debug conversion": conversionMs,
      },
    };
  },
};
