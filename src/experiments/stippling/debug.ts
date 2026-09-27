import type { DebugView, PointResult, RasterResult } from "../../core/results/types";
import type { IntensityImage } from "./types";

export function intensityRaster(image: IntensityImage, invert = false): RasterResult {
  const pixels = new Uint8ClampedArray(image.values.length * 4);
  for (let index = 0; index < image.values.length; index += 1) {
    const shade = Math.round(255 * (invert ? 1 - image.values[index] : image.values[index]));
    const offset = index * 4;
    pixels[offset] = shade;
    pixels[offset + 1] = shade;
    pixels[offset + 2] = shade;
    pixels[offset + 3] = 255;
  }
  return {
    kind: "raster",
    imageData: new ImageData(pixels, image.width, image.height),
  };
}

export function createPlacementDebugViews(
  original: ImageData,
  intensity: IntensityImage,
  output: PointResult,
): DebugView[] {
  return [
    { id: "original", label: "Original", result: { kind: "raster", imageData: original } },
    {
      id: "processing-brightness",
      label: "Processing Brightness",
      result: intensityRaster(intensity),
    },
    {
      id: "darkness-density",
      label: "Darkness / Acceptance Probability",
      result: intensityRaster(intensity, true),
    },
    { id: "final-stipples", label: "Final Stipples", result: output },
  ];
}
