import type { ExperimentResultRenderer } from "../../../core/rendering/types";
import type { StrokeMark, StrokeResult, StrokeTextureConfig } from "../../../core/results/types";
import { solidStrokeResult, drawSolidStrokes } from "./solid";
import type { BrushTextureConfig } from "../brushes";
import type { PainterlyStroke } from "../types";

interface ArcSample {
  x: number;
  y: number;
  angle: number;
}

function normalize(x: number, y: number) {
  const length = Math.hypot(x, y);
  return length > 1e-8 ? { x: x / length, y: y / length } : { x: 1, y: 0 };
}

function arcSample(points: Array<{ x: number; y: number }>, distance: number): ArcSample {
  if (points.length < 2) return { x: points[0]?.x ?? 0, y: points[0]?.y ?? 0, angle: 0 };
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const total = cumulative[cumulative.length - 1];
  const target = Math.max(0, Math.min(total, distance));
  let segment = 1;
  while (segment < cumulative.length - 1 && cumulative[segment] < target) segment++;
  const start = points[segment - 1], end = points[segment];
  const segmentLength = cumulative[segment] - cumulative[segment - 1];
  const t = segmentLength > 1e-8 ? (target - cumulative[segment - 1]) / segmentLength : 0;
  const tangent = normalize(end.x - start.x, end.y - start.y);
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t, angle: Math.atan2(tangent.y, tangent.x) };
}

function arcSamples(points: Array<{ x: number; y: number }>, distance: number): ArcSample[] {
  if (!points.length) return [];
  if (points.length === 1) return [arcSample(points, 0)];
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  const samples: ArcSample[] = [];
  for (let at = 0; at < total; at += Math.max(0.25, distance)) samples.push(arcSample(points, at));
  samples.push(arcSample(points, total));
  let previous = { x: Math.cos(samples[0].angle), y: Math.sin(samples[0].angle) };
  return samples.map((sample) => {
    let tangent = { x: Math.cos(sample.angle), y: Math.sin(sample.angle) };
    if (tangent.x * previous.x + tangent.y * previous.y < 0) tangent = { x: -tangent.x, y: -tangent.y };
    // A short blend removes visible orientation jumps at sharp polyline corners.
    tangent = normalize(previous.x * 0.35 + tangent.x * 0.65, previous.y * 0.35 + tangent.y * 0.65);
    previous = tangent;
    return { ...sample, angle: Math.atan2(tangent.y, tangent.x) };
  });
}

function textureResultConfig(texture: BrushTextureConfig): StrokeTextureConfig {
  return {
    type: texture.type,
    maskWidth: texture.mask.width,
    maskHeight: texture.mask.height,
    mask: texture.mask.data,
    textureSpacing: texture.textureSpacing,
    textureScale: texture.textureScale,
    rotationOffset: texture.rotationOffset,
  };
}

function stampCanvas(texture: StrokeTextureConfig, stroke: StrokeMark) {
  const canvas = document.createElement("canvas");
  canvas.width = texture.maskWidth;
  canvas.height = texture.maskHeight;
  const stampContext = canvas.getContext("2d");
  if (!stampContext) throw new Error("Your browser could not create a brush mask canvas.");
  const image = stampContext.createImageData(texture.maskWidth, texture.maskHeight);
  const color = stroke.color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  for (let i = 0; i < texture.maskWidth * texture.maskHeight; i++) {
    const maskValue = Math.max(0, Math.min(1, Number(texture.mask[i] ?? 0)));
    const alpha = Math.round(maskValue * (stroke.opacity ?? 1) * 255);
    const offset = i * 4;
    image.data[offset] = Math.max(0, Math.min(255, Math.round(color[0] ?? 0)));
    image.data[offset + 1] = Math.max(0, Math.min(255, Math.round(color[1] ?? 0)));
    image.data[offset + 2] = Math.max(0, Math.min(255, Math.round(color[2] ?? 0)));
    image.data[offset + 3] = alpha;
  }
  stampContext.putImageData(image, 0, 0);
  return canvas;
}

export function drawTexturedStrokes(context: CanvasRenderingContext2D, strokes: StrokeMark[], texture: StrokeTextureConfig) {
  context.imageSmoothingEnabled = true;
  context.globalAlpha = 1;
  for (const stroke of strokes) {
    if (!stroke.points.length || stroke.width <= 0) continue;
    const stamp = stampCanvas(texture, stroke);
    const diameter = stroke.width * texture.textureScale;
    const spacing = Math.max(0.25, texture.textureSpacing * stroke.width);
    for (const sample of arcSamples(stroke.points, spacing)) {
      context.save();
      context.translate(sample.x, sample.y);
      context.rotate(sample.angle + texture.rotationOffset * Math.PI / 180);
      context.drawImage(stamp, -diameter / 2, -diameter / 2, diameter, diameter);
      context.restore();
    }
  }
}

export function texturedStrokeResult(width: number, height: number, strokes: PainterlyStroke[], texture: BrushTextureConfig, background = "#ffffff"): StrokeResult {
  return { ...solidStrokeResult(width, height, strokes, background), texture: textureResultConfig(texture) };
}

export const renderTexturedStrokes: ExperimentResultRenderer = (result, { canvas }) => {
  if (result.kind !== "strokes" || !result.texture) throw new Error("The textured brush renderer requires a texture configuration.");
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create a 2D canvas context.");
  context.globalAlpha = 1;
  context.fillStyle = result.background ?? "#ffffff";
  context.fillRect(0, 0, result.width, result.height);
  drawTexturedStrokes(context, result.strokes, result.texture);
};

export function createTexturedPaintingSurface(width: number, height: number, texture: BrushTextureConfig) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not create a 2D painting canvas.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  return {
    drawLayer: (strokes: PainterlyStroke[]) => drawTexturedStrokes(context, solidStrokeResult(width, height, strokes).strokes, textureResultConfig(texture)),
    snapshot: () => context.getImageData(0, 0, width, height),
  };
}

export function renderPainterlyStrokes(result: Parameters<ExperimentResultRenderer>[0], target: Parameters<ExperimentResultRenderer>[1]) {
  if (result.kind !== "strokes") throw new Error("Painterly rendering requires strokes.");
  if (result.texture) renderTexturedStrokes(result, target);
  else {
    // Keep the shared solid renderer as the canonical Phase 1C path.
    const context = target.canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not create a 2D canvas context.");
    target.canvas.width = result.width;
    target.canvas.height = result.height;
    context.fillStyle = result.background ?? "#ffffff";
    context.fillRect(0, 0, result.width, result.height);
    drawSolidStrokes(context, result.strokes);
  }
}
