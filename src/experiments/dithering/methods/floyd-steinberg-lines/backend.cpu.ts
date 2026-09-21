import type { ExperimentBackend } from "../../../../core/backends/types";
import type { DebugView } from "../../../../core/results/types";
import {
  binaryImageToRaster,
  coverageToRaster,
  createDiffusionDebugViews,
  createDitheringDebugViews,
  seedMaskToRaster,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { DitheringParameters } from "../../types";
import { ditherFloydSteinbergLines } from "./algorithm.cpu";

export const floydSteinbergLinesCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const intensity = createProcessingIntensity(source.imageData);
    const result = ditherFloydSteinbergLines(
      intensity,
      parameters.lineLength,
      debugEnabled,
    );
    const output = binaryImageToRaster(result.image);
    const methodViews: DebugView[] = createDiffusionDebugViews(
      result.debug,
      intensity.width,
      intensity.height,
    );

    if (result.debug?.lineSeeds) {
      methodViews.push({
        id: "line-seeds",
        label: "Line seed pixels",
        result: seedMaskToRaster(
          result.debug.lineSeeds,
          intensity.width,
          intensity.height,
        ),
      });
    }
    if (result.debug?.lineCoverage) {
      methodViews.push({
        id: "line-coverage",
        label: "Line coverage and overlap",
        result: coverageToRaster(
          result.debug.lineCoverage,
          intensity.width,
          intensity.height,
        ),
      });
    }

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
