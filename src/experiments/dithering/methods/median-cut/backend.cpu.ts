import type { ExperimentBackend } from "../../../../core/backends/types";
import { imageDataAsRgbaImage, rgbaImageToRaster } from "../../colorDebug";
import type { DitheringParameters } from "../../types";
import { quantizeToFixedPalette } from "../fixed-palette/algorithm.cpu";
import { ditherFixedPaletteFloydSteinberg } from "../fixed-palette/algorithm.floyd-steinberg.cpu";
import { createFixedPaletteDebugViews } from "../fixed-palette/debug";
import { parsePaletteDitheringStrategy } from "../fixed-palette/strategy";
import { generateMedianCutPalette } from "./algorithm.cpu";

export const medianCutCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    const preparationStartedAt = performance.now();
    const rgbSource = imageDataAsRgbaImage(source.imageData);
    const strategy = parsePaletteDitheringStrategy(
      parameters.paletteDitheringStrategy,
    );
    const preparationMs = performance.now() - preparationStartedAt;

    const generationStartedAt = performance.now();
    const palette = generateMedianCutPalette(rgbSource, parameters.paletteSize);
    const generationMs = performance.now() - generationStartedAt;

    const applicationStartedAt = performance.now();
    const result =
      strategy === "floyd-steinberg"
        ? ditherFixedPaletteFloydSteinberg(rgbSource, palette, debugEnabled)
        : quantizeToFixedPalette(rgbSource, palette, debugEnabled);
    const applicationMs = performance.now() - applicationStartedAt;

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
            "Generated palette swatches",
          )
        : undefined;
    const debugMs = performance.now() - debugStartedAt;

    return {
      output,
      debugViews,
      stageTimings: {
        "Input preparation": preparationMs,
        "Palette generation": generationMs,
        "Palette application": applicationMs,
        "Result conversion": conversionMs,
        ...(debugEnabled ? { "Debug views": debugMs } : {}),
      },
    };
  },
};
