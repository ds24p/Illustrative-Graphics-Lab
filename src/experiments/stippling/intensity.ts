import { processingBrightness } from "../../core/images/processingBrightness";
import type { IntensityImage } from "./types";

export function createProcessingIntensity(source: ImageData): IntensityImage {
  const values = new Float32Array(source.width * source.height);
  for (let pixel = 0; pixel < values.length; pixel += 1) {
    const offset = pixel * 4;
    values[pixel] = processingBrightness(
      source.data[offset],
      source.data[offset + 1],
      source.data[offset + 2],
    );
  }
  return { width: source.width, height: source.height, values };
}
