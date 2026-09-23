import type { DebugView, RasterResult } from "../../../../core/results/types";
import { imageDataToRaster, scalarImageToRaster } from "../../debug";
import type { IntensityImage } from "../../types";
import type { TextScreeningDebugData } from "./types";

export function createTextScreeningDebugViews(
  source: ImageData,
  intensity: IntensityImage,
  debug: TextScreeningDebugData,
  output: RasterResult,
): DebugView[] {
  return [
    { id: "original", label: "Original", result: imageDataToRaster(source) },
    {
      id: "processing-brightness",
      label: "Processing brightness",
      result: scalarImageToRaster(
        intensity.values,
        intensity.width,
        intensity.height,
      ),
    },
    {
      id: "block-average-intensity",
      label: "Block average intensity",
      result: scalarImageToRaster(
        debug.blockAverageMap,
        intensity.width,
        intensity.height,
      ),
    },
    {
      id: "intensity-level-map",
      label: "Intensity level map (0-7)",
      result: scalarImageToRaster(
        debug.levelMap,
        intensity.width,
        intensity.height,
      ),
    },
    {
      id: "selected-glyph-map",
      label: "Selected characters / glyph map",
      result: scalarImageToRaster(
        debug.selectedGlyphMap,
        intensity.width,
        intensity.height,
      ),
    },
    { id: "final-result", label: "Final result", result: output },
  ];
}
