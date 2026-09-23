import type { DebugView, RasterResult } from "../../../../core/results/types";
import {
  imageDataToRaster,
  scalarImageToRaster,
} from "../../debug";
import type {
  IntensityImage,
  ProceduralDebugData,
} from "../../types";

export function createProceduralDebugViews(
  source: ImageData,
  intensity: IntensityImage,
  debug: ProceduralDebugData,
  output: RasterResult,
): DebugView[] {
  const views: DebugView[] = [
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
      id: "raw-procedural-kernel",
      label: "Raw procedural kernel K(s, t)",
      result: scalarImageToRaster(
        debug.rawKernel.values,
        debug.rawKernel.width,
        debug.rawKernel.height,
      ),
    },
    {
      id: "modulo-mapped-kernel",
      label: "Modulo-mapped kernel (before rotation)",
      result: scalarImageToRaster(
        debug.moduloMappedKernel,
        intensity.width,
        intensity.height,
      ),
    },
  ];

  if (debug.thresholdBeforeSine) {
    views.push({
      id: "threshold-before-sine",
      label: "Rotated threshold before sine displacement",
      result: scalarImageToRaster(
        debug.thresholdBeforeSine,
        intensity.width,
        intensity.height,
      ),
    });
  }

  views.push(
    {
      id: "final-threshold-field",
      label: "Final threshold field",
      result: scalarImageToRaster(
        debug.thresholdField,
        intensity.width,
        intensity.height,
      ),
    },
    { id: "final-result", label: "Final result", result: output },
  );

  return views;
}
