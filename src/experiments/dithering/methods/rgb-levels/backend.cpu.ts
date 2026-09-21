import type { ExperimentBackend } from "../../../../core/backends/types";
import {
  createRgbLevelsDebugViews,
  imageDataAsRgbaImage,
  rgbaImageToRaster,
} from "../../colorDebug";
import type { DitheringParameters } from "../../types";
import { quantizeRgbLevels } from "./algorithm.cpu";

export const rgbLevelsCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const rgbSource = imageDataAsRgbaImage(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = quantizeRgbLevels(rgbSource, parameters.levelsPerChannel);
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = rgbaImageToRaster(result);
    const conversionMs = performance.now() - conversionStartedAt;

    const debugStartedAt = performance.now();
    const debugViews = debugEnabled
      ? createRgbLevelsDebugViews(
          source.imageData,
          output,
          parameters.levelsPerChannel,
        )
      : undefined;
    const debugMs = performance.now() - debugStartedAt;

    return {
      output,
      debugViews,
      stageTimings: {
        "Input preparation": preparationMs,
        "Algorithm execution": algorithmMs,
        "Result conversion": conversionMs,
        ...(debugEnabled ? { "Debug views": debugMs } : {}),
      },
    };
  },
};
