import type { ExperimentBackend } from "../../../../core/backends/types";
import {
  binaryImageToRaster,
  createDiffusionDebugViews,
  createDitheringDebugViews,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { DitheringParameters } from "../../types";
import { ditherFloydSteinberg2D } from "./algorithm.cpu";

export const floydSteinberg2DCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, debugEnabled }) {
    const intensity = createProcessingIntensity(source.imageData);
    const result = ditherFloydSteinberg2D(intensity, debugEnabled);
    const output = binaryImageToRaster(result.image);
    const methodViews = createDiffusionDebugViews(
      result.debug,
      intensity.width,
      intensity.height,
    );

    return {
      output,
      debugViews: debugEnabled
        ? createDitheringDebugViews(
            source.imageData,
            intensity,
            output,
            methodViews,
          )
        : undefined,
    };
  },
};
