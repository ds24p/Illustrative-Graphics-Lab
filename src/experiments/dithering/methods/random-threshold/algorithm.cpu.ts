import { coordinateRandom } from "../../random";
import type { DitheringCoreResult, IntensityImage } from "../../types";

export interface RandomThresholdResult extends DitheringCoreResult {
  randomThresholds?: Float32Array;
}

export function randomThresholdAt(
  x: number,
  y: number,
  threshold: number,
  amplitude: number,
  seed: number,
) {
  // Match the shader's f32 arithmetic after the integer hash.
  const random = coordinateRandom(x, y, seed);
  const centered = Math.fround(Math.fround(random * 2) - 1);
  const offset = Math.fround(centered * Math.fround(amplitude));
  return Math.fround(Math.fround(threshold) + offset);
}

export function createRandomThresholdField(
  width: number,
  height: number,
  threshold: number,
  amplitude: number,
  seed: number,
) {
  const values = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values[x + y * width] = randomThresholdAt(
        x,
        y,
        threshold,
        amplitude,
        seed,
      );
    }
  }
  return values;
}

export function ditherRandomThreshold(
  source: IntensityImage,
  threshold: number,
  amplitude: number,
  seed: number,
  debugEnabled: boolean,
): RandomThresholdResult {
  const output = new Uint8Array(source.values.length);
  const randomThresholds = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = x + y * source.width;
      const randomizedThreshold = randomThresholdAt(
        x,
        y,
        threshold,
        amplitude,
        seed,
      );
      output[index] = source.values[index] >= randomizedThreshold ? 1 : 0;
      if (randomThresholds) randomThresholds[index] = randomizedThreshold;
    }
  }

  return {
    image: { width: source.width, height: source.height, values: output },
    randomThresholds,
  };
}
