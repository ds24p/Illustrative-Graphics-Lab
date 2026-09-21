import type { ExperimentBackend } from "../../../../core/backends/types";
import {
  createOrderedRgbLevelsDebugViews,
  imageDataAsRgbaImage,
  rgbaImageToRaster,
} from "../../colorDebug";
import type { DitheringParameters } from "../../types";
import { quantizeRgbLevels } from "../rgb-levels/algorithm.cpu";
import {
  orderedDitherRgbLevels,
  parseBayerMatrixSize,
} from "./algorithm.cpu";

export const orderedRgbLevelsCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const rgbSource = imageDataAsRgbaImage(source.imageData);
    const matrixSize = parseBayerMatrixSize(parameters.bayerMatrixSize);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = orderedDitherRgbLevels(
      rgbSource,
      parameters.levelsPerChannel,
      matrixSize,
    );
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = rgbaImageToRaster(result);
    const conversionMs = performance.now() - conversionStartedAt;

    const debugStartedAt = performance.now();
    const debugViews = debugEnabled
      ? createOrderedRgbLevelsDebugViews(
          source.imageData,
          quantizeRgbLevels(rgbSource, parameters.levelsPerChannel),
          matrixSize,
          output,
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
