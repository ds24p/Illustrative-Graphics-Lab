import type { DebugView, PointResult, RasterResult } from "../../../../core/results/types";
import { intensityRaster } from "../../debug";
import { getAvgIntensity } from "../../localAverage";
import type { IntensityImage, StipplingParameters } from "../../types";

function spacingField(
  intensity: IntensityImage,
  mode: StipplingParameters["spacingMode"],
): RasterResult {
  const pixels = new Uint8ClampedArray(intensity.values.length * 4);
  for (let y = 0; y < intensity.height; y += 1) {
    for (let x = 0; x < intensity.width; x += 1) {
      // This is the same fixed local lookup used by a candidate at integer (x, y).
      const average = getAvgIntensity(intensity, x - 2, y - 2, x + 2, y + 2);
      const shade = average > 0.95
        ? 255
        : mode === "uniform" ? 180 : Math.round(32 + 200 * average / 0.95);
      const offset = (y * intensity.width + x) * 4;
      pixels[offset] = shade;
      pixels[offset + 1] = shade;
      pixels[offset + 2] = shade;
      pixels[offset + 3] = 255;
    }
  }
  return { kind: "raster", imageData: new ImageData(pixels, intensity.width, intensity.height) };
}

export function createPoissonDebugViews(
  original: ImageData,
  intensity: IntensityImage,
  output: PointResult,
  mode: StipplingParameters["spacingMode"],
  occupancy?: Uint8Array,
): DebugView[] {
  const occupancyView = occupancy
    ? occupancyRaster(occupancy, intensity.width, intensity.height)
    : undefined;
  return [
    { id: "original", label: "Original", result: { kind: "raster", imageData: original } },
    { id: "processing-brightness", label: "Processing Brightness", result: intensityRaster(intensity) },
    { id: "spacing-field", label: mode === "uniform" ? "Uniform Spacing Field" : "Adaptive Spacing Field", result: spacingField(intensity, mode) },
    ...(occupancyView ? [
      { id: "occupancy-buffer", label: "Occupancy Buffer", result: occupancyView },
      { id: "centers-over-occupancy", label: "Centers over Occupancy", result: centersOverOccupancy(occupancyView, output) },
    ] : []),
    { id: "final-stipples", label: "Final Stipples", result: output },
  ];
}

function centersOverOccupancy(occupancy: RasterResult, output: PointResult): RasterResult {
  const { width, height, data } = occupancy.imageData;
  const pixels = new Uint8ClampedArray(data);
  for (const point of output.points) {
    const centerX = Math.round(point.x);
    const centerY = Math.round(point.y);
    for (let y = Math.max(0, centerY - 1); y <= Math.min(height - 1, centerY + 1); y += 1) {
      for (let x = Math.max(0, centerX - 1); x <= Math.min(width - 1, centerX + 1); x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 235;
        pixels[offset + 1] = 55;
        pixels[offset + 2] = 55;
        pixels[offset + 3] = 255;
      }
    }
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

function occupancyRaster(occupancy: Uint8Array, width: number, height: number): RasterResult {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < occupancy.length; index += 1) {
    const shade = occupancy[index] === 0 ? 255 : 0;
    const offset = index * 4;
    pixels[offset] = shade;
    pixels[offset + 1] = shade;
    pixels[offset + 2] = shade;
    pixels[offset + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}
