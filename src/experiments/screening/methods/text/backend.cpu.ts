import type { ExperimentBackend } from "../../../../core/backends/types";
import { scalarImageToRaster } from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { ScreeningParameters } from "../../types";
import { screenWithText } from "./algorithm.cpu";
import { loadTextGlyphAtlas } from "./atlas";
import { createTextScreeningDebugViews } from "./debug";
import { scaleGlyphAtlas } from "./scale";

export const textScreeningCpuBackend: ExperimentBackend<ScreeningParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const atlas = scaleGlyphAtlas(
      await loadTextGlyphAtlas(),
      parameters.textScale ?? 1,
    );
    const intensity = createProcessingIntensity(source.imageData);
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result = screenWithText(
      intensity,
      atlas,
      parameters.textSeed,
      debugEnabled,
    );
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = scalarImageToRaster(
      result.image.values,
      result.image.width,
      result.image.height,
    );
    const debugViews =
      debugEnabled && result.debug
        ? createTextScreeningDebugViews(
            source.imageData,
            intensity,
            result.debug,
            output,
          )
        : undefined;
    const conversionMs = performance.now() - conversionStartedAt;

    return {
      output,
      debugViews,
      stageTimings: {
        "Atlas and source preparation": preparationMs,
        "Cell algorithm execution": algorithmMs,
        "Result conversion": conversionMs,
      },
    };
  },
};
