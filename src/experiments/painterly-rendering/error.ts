import type { Point, RgbColor, RgbImage } from "./types";

export const MAX_RGB_ERROR = 3 * 255 * 255;

// Squared distance on RGB channels in [0,255]; no square root or channel average.
export function colorError(a: RgbColor, b: RgbColor) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

export function computeErrorMap(reference: RgbImage, canvas: RgbImage): Float32Array {
  if (reference.width !== canvas.width || reference.height !== canvas.height) throw new Error("Reference and canvas dimensions must match.");
  const errors = new Float32Array(reference.width * reference.height);
  for (let i = 0; i < errors.length; i++) {
    const j = i * 3;
    errors[i] = (reference.data[j] - canvas.data[j]) ** 2 +
      (reference.data[j + 1] - canvas.data[j + 1]) ** 2 +
      (reference.data[j + 2] - canvas.data[j + 2]) ** 2;
  }
  return errors;
}

export function selectStrokeSeeds(errors: Float32Array, width: number, height: number, spacing: number, threshold: number): Point[] {
  const seeds: Point[] = [];
  for (let top = 0; top < height; top += spacing) {
    for (let left = 0; left < width; left += spacing) {
      const right = Math.min(width, left + spacing), bottom = Math.min(height, top + spacing);
      const cx = (left + right) / 2, cy = (top + bottom) / 2;
      let sum = 0, maximum = -1, nearest = Infinity;
      let seed: Point = { x: left + 0.5, y: top + 0.5 };
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const error = errors[y * width + x];
          const distance = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
          sum += error;
          // Equal maxima prefer the cell center, avoiding a top-left bias on flat images.
          if (error > maximum || (error === maximum && distance < nearest)) {
            maximum = error; nearest = distance; seed = { x: x + 0.5, y: y + 0.5 };
          }
        }
      }
      if (sum / ((right - left) * (bottom - top)) > threshold) seeds.push(seed);
    }
  }
  return seeds;
}
