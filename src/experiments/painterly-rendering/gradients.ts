import { processingBrightness } from "../../core/images/processingBrightness";
import type { GradientField, Point, RgbImage } from "./types";

export const GRADIENT_EPSILON = 1e-6;

export function sobelGradients(image: RgbImage): GradientField {
  const { width, height } = image;
  const intensity = new Float32Array(width * height);
  const gx = new Float32Array(intensity.length);
  const gy = new Float32Array(intensity.length);
  const magnitude = new Float32Array(intensity.length);
  for (let i = 0; i < intensity.length; i++) {
    intensity[i] = processingBrightness(image.data[i * 3], image.data[i * 3 + 1], image.data[i * 3 + 2]);
  }
  const at = (x: number, y: number) => intensity[
    Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1);
      const d = at(x - 1, y), f = at(x + 1, y);
      const g = at(x - 1, y + 1), h = at(x, y + 1), i = at(x + 1, y + 1);
      const index = y * width + x;
      gx[index] = -a + c - 2 * d + 2 * f - g + i;
      gy[index] = -a - 2 * b - c + g + 2 * h + i;
      magnitude[index] = Math.hypot(gx[index], gy[index]);
    }
  }
  return { width, height, gx, gy, magnitude };
}

export function contourDirection(field: GradientField, point: Point): Point | undefined {
  const x = Math.max(0, Math.min(field.width - 1, Math.floor(point.x)));
  const y = Math.max(0, Math.min(field.height - 1, Math.floor(point.y)));
  const i = y * field.width + x;
  const length = field.magnitude[i];
  if (length < GRADIENT_EPSILON) return undefined;
  return { x: -field.gy[i] / length, y: field.gx[i] / length };
}
