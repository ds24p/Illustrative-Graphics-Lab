import { colorError } from "./error";
import { contourDirection } from "./gradients";
import { sampleColor } from "./image";
import type { GradientField, PainterlyStroke, Point, RgbImage } from "./types";

export interface StrokeOptions {
  radius: number;
  step: number;
  minSegments: number;
  maxSegments: number;
  directionFollowing?: number;
  /** @deprecated Phase 1B alias. Values are interpreted as 1 - directionFollowing. */
  smoothing?: number;
  opacity?: number;
  colorJitter?: number;
}

/** Blend the previous path direction with the local contour direction.
 * alpha=0 continues straight; alpha=1 follows the contour field.
 */
export function continuousDirection(local: Point, previous: Point, directionFollowing: number): Point {
  const sign = local.x * previous.x + local.y * previous.y < 0 ? -1 : 1;
  const alpha = Math.max(0, Math.min(1, directionFollowing));
  const x = (1 - alpha) * previous.x + alpha * sign * local.x;
  const y = (1 - alpha) * previous.y + alpha * sign * local.y;
  const length = Math.hypot(x, y);
  return length > 1e-8 ? { x: x / length, y: y / length } : previous;
}

function jitteredColor(color: ReturnType<typeof sampleColor>, amount: number, random: () => number) {
  if (amount <= 0) return color;
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  return {
    r: clamp(color.r + (random() * 2 - 1) * amount),
    g: clamp(color.g + (random() * 2 - 1) * amount),
    b: clamp(color.b + (random() * 2 - 1) * amount),
  };
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
  const color = jitteredColor(sampleColor(reference, seed.x, seed.y), options.colorJitter ?? 0, random);
  const stroke: PainterlyStroke = { points: [{ ...seed }], color, radius: options.radius, opacity: options.opacity ?? 1 };
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
    if (local) {
      const following = options.directionFollowing ?? (options.smoothing === undefined ? 0.5 : 1 - options.smoothing);
      direction = continuousDirection(local, direction, following);
    }
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
