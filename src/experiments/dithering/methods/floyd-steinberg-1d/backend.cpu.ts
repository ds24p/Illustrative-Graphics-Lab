import type { ExperimentBackend } from "../../../../core/backends/types";
import {
  binaryImageToRaster,
  createDiffusionDebugViews,
  createDitheringDebugViews,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { DitheringParameters } from "../../types";
import { ditherFloydSteinberg1D } from "./algorithm.cpu";

export const floydSteinberg1DCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, debugEnabled }) {
    const intensity = createProcessingIntensity(source.imageData);
    const result = ditherFloydSteinberg1D(intensity, debugEnabled);
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
