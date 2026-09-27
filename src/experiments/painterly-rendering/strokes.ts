import { colorError } from "./error";
import { contourDirection } from "./gradients";
import { sampleColor } from "./image";
import type { GradientField, PainterlyStroke, Point, RgbImage } from "./types";

export interface StrokeOptions {
  radius: number;
  step: number;
  minSegments: number;
  maxSegments: number;
  smoothing: number;
}

export function continuousDirection(local: Point, previous: Point, smoothing: number): Point {
  const sign = local.x * previous.x + local.y * previous.y < 0 ? -1 : 1;
  const x = smoothing * previous.x + (1 - smoothing) * sign * local.x;
  const y = smoothing * previous.y + (1 - smoothing) * sign * local.y;
  const length = Math.hypot(x, y);
  return length > 1e-8 ? { x: x / length, y: y / length } : previous;
}

// Clip a segment to the pixel-center rectangle. No out-of-bounds points or duplicate endpoints.
function availableStep(point: Point, direction: Point, step: number, width: number, height: number) {
  let distance = step;
  if (direction.x > 1e-8) distance = Math.min(distance, (width - 0.5 - point.x) / direction.x);
  if (direction.x < -1e-8) distance = Math.min(distance, (0.5 - point.x) / direction.x);
  if (direction.y > 1e-8) distance = Math.min(distance, (height - 0.5 - point.y) / direction.y);
  if (direction.y < -1e-8) distance = Math.min(distance, (0.5 - point.y) / direction.y);
  return Math.max(0, distance);
}

export function generateStroke(seed: Point, reference: RgbImage, canvas: RgbImage, field: GradientField, options: StrokeOptions, random: () => number): PainterlyStroke {
  const color = sampleColor(reference, seed.x, seed.y);
  const stroke: PainterlyStroke = { points: [{ ...seed }], color, radius: options.radius, opacity: 1 };
  let direction = contourDirection(field, seed);
  if (!direction) {
    const angle = random() * Math.PI * 2;
    direction = { x: Math.cos(angle), y: Math.sin(angle) };
  }
  if (availableStep(seed, direction, options.step, reference.width, reference.height) < 1e-6) {
    direction = { x: -direction.x, y: -direction.y };
  }
  for (let segment = 0; segment < options.maxSegments; segment++) {
    const current = stroke.points[stroke.points.length - 1];
    const local = contourDirection(field, current);
    if (local) direction = continuousDirection(local, direction, options.smoothing);
    // At a flat sample, retain the last valid (or seeded initial) direction.
    const step = availableStep(current, direction, options.step, reference.width, reference.height);
    if (step < 1e-6) break;
    const next = {
      x: Math.max(0.5, Math.min(reference.width - 0.5, current.x + direction.x * step)),
      y: Math.max(0.5, Math.min(reference.height - 0.5, current.y + direction.y * step)),
    };
    if (segment >= options.minSegments) {
      const target = sampleColor(reference, next.x, next.y);
      // Hertzmann stopping: preserve a canvas sample already closer to the reference than this stroke's color.
      if (colorError(target, sampleColor(canvas, next.x, next.y)) < colorError(target, color)) break;
    }
    stroke.points.push(next);
    if (step < options.step - 1e-6) break;
  }
  return stroke;
}
