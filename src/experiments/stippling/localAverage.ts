import type { IntensityImage } from "./types";

export function getAvgIntensity(
  image: IntensityImage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const left = Math.max(0, Math.min(image.width, x1));
  const right = Math.max(0, Math.min(image.width, x2));
  const top = Math.max(0, Math.min(image.height, y1));
  const bottom = Math.max(0, Math.min(image.height, y2));
  if (right <= left || bottom <= top) {
    throw new Error("The intensity window must include at least one pixel.");
  }

  let sum = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      sum += image.values[y * image.width + x];
    }
  }
  return sum / ((right - left) * (bottom - top));
}
