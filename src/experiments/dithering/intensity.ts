import type { IntensityImage } from "./types";
import { processingBrightness } from "../../core/images/processingBrightness";

export { processingBrightness } from "../../core/images/processingBrightness";

export function createProcessingIntensity(source: ImageData): IntensityImage {
  const values = new Float32Array(source.width * source.height);

  for (let index = 0, pixel = 0; index < source.data.length; index += 4) {
    values[pixel] = processingBrightness(
      source.data[index],
      source.data[index + 1],
      source.data[index + 2],
    );
    pixel += 1;
  }

  return { width: source.width, height: source.height, values };
}
