import type { DebugView, PointResult, RasterResult } from "../../../../../core/results/types";
import { intensityRaster } from "../../../debug";
import type { IntensityImage, PlacementPoint } from "../../../types";
import { ownershipColor } from "../debug";
import { toPointResult } from "../result";
import type { HistoricalLloydResult } from "./algorithm.cpu";
import { renderConeOwnership, type ConeOwnership } from "./coneRaster";

function ownershipImage(ownership: ConeOwnership, readable: boolean): RasterResult {
  const { width, height } = ownership;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < ownership.owners.length; pixel += 1) {
    const owner = ownership.owners[pixel];
    const offset = pixel * 4;
    const color = readable && owner >= 0
      ? ownershipColor(owner)
      : readable ? [127, 127, 127] : [
          (ownership.encodedRgb[pixel] >> 16) & 0xff,
          (ownership.encodedRgb[pixel] >> 8) & 0xff,
          ownership.encodedRgb[pixel] & 0xff,
        ];
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function createHistoricalLloydDebugViews(
  original: ImageData,
  intensity: IntensityImage,
  result: HistoricalLloydResult,
  output: PointResult,
  dotSize: number,
  iterations: number,
): DebugView[] {
  const { width, height } = intensity;
  const pointView = (points: readonly PlacementPoint[]) => toPointResult(points, width, height, dotSize);
  // For zero iterations there was no movement pass. Rendering once here gives
  // an explanatory ownership view without changing the algorithmic output.
  const ownership = result.ownership ?? renderConeOwnership(result.initialPoints, width, height);
  return [
    { id: "original", label: "Original", result: { kind: "raster", imageData: original } },
    { id: "processing-brightness", label: "Processing Brightness", result: intensityRaster(intensity) },
    { id: "darkness-weight", label: "Darkness / Weight Map", result: intensityRaster(intensity, true) },
    { id: "initial-points", label: "Initial Points", result: pointView(result.initialPoints) },
    { id: "encoded-ownership", label: iterations === 0 ? "Encoded Ownership (initial sites)" : "Encoded Ownership (last pass)", result: ownershipImage(ownership, false) },
    { id: "decoded-ownership", label: iterations === 0 ? "Decoded Ownership (initial sites)" : "Decoded Ownership (last pass)", result: ownershipImage(ownership, true) },
    { id: "before-final-iteration", label: iterations === 0 ? "Before Final Iteration (initial)" : "Points Before Final Iteration", result: pointView(result.beforeFinalIteration) },
    { id: "after-final-iteration", label: "Points After Final Iteration", result: pointView(result.finalPoints) },
    { id: "final-stipples", label: "Final Stipples", result: output },
  ];
}
