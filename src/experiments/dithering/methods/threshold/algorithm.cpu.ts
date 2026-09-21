import type { DitheringCoreResult, IntensityImage } from "../../types";

export function ditherThreshold(
  source: IntensityImage,
  threshold: number,
): DitheringCoreResult {
  const output = new Uint8Array(source.values.length);

  for (let index = 0; index < source.values.length; index += 1) {
    output[index] = source.values[index] >= threshold ? 1 : 0;
  }

  return {
    image: { width: source.width, height: source.height, values: output },
  };
}
