import type { ExperimentBackend } from "../../../../core/backends/types";
import { imageDataAsRgbaImage, rgbaImageToRaster } from "../../colorDebug";
import { resolvePalette } from "../../palettes";
import type { DitheringParameters } from "../../types";
import { quantizeToFixedPalette } from "./algorithm.cpu";
import { ditherFixedPaletteFloydSteinberg } from "./algorithm.floyd-steinberg.cpu";
import { createFixedPaletteDebugViews } from "./debug";
import { parsePaletteDitheringStrategy } from "./strategy";

export const fixedPaletteCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const rgbSource = imageDataAsRgbaImage(source.imageData);
    const palette = resolvePalette(parameters.palette, parameters.customPalette);
    const strategy = parsePaletteDitheringStrategy(
      parameters.paletteDitheringStrategy,
    );
    const preparationMs = performance.now() - preparationStartedAt;

    const algorithmStartedAt = performance.now();
    const result =
      strategy === "floyd-steinberg"
        ? ditherFixedPaletteFloydSteinberg(rgbSource, palette, debugEnabled)
        : quantizeToFixedPalette(rgbSource, palette, debugEnabled);
    const algorithmMs = performance.now() - algorithmStartedAt;

    const conversionStartedAt = performance.now();
    const output = rgbaImageToRaster(result.image);
    const conversionMs = performance.now() - conversionStartedAt;

    const debugStartedAt = performance.now();
    const quantizedWithoutDiffusion =
      debugEnabled && strategy === "floyd-steinberg"
        ? rgbaImageToRaster(quantizeToFixedPalette(rgbSource, palette).image)
        : output;
    const debugViews =
      debugEnabled && result.errorSquared
        ? createFixedPaletteDebugViews(
            source.imageData,
            palette,
            quantizedWithoutDiffusion,
            output,
            result.errorSquared,
            strategy,
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
