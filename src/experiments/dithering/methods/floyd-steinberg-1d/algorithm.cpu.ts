import type { DitheringCoreResult, IntensityImage } from "../../types";

export function ditherFloydSteinberg1D(
  source: IntensityImage,
  debugEnabled: boolean,
): DitheringCoreResult {
  const working = new Float32Array(source.values);
  const output = new Uint8Array(source.values.length);
  const adjustedIntensity = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;
  const incomingError = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = x + y * source.width;
      const adjusted = working[index];
      const quantized = adjusted >= 0.5 ? 1 : 0;
      output[index] = quantized;

      if (adjustedIntensity && incomingError) {
        adjustedIntensity[index] = adjusted;
        incomingError[index] = adjusted - source.values[index];
      }

      const error = adjusted - quantized;
      if (x + 1 < source.width) working[index + 1] += error;
    }
  }

  return {
    image: { width: source.width, height: source.height, values: output },
    debug: debugEnabled ? { adjustedIntensity, incomingError } : undefined,
  };
}
