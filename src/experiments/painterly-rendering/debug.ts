import type { DebugViewDefinition } from "../../core/experiments/types";
import type { DebugView, PathResult, RasterResult } from "../../core/results/types";
import { solidStrokeResult } from "./renderers/solid";
import { texturedStrokeResult } from "./renderers/textured";
import type { BrushTextureConfig } from "./brushes";
import { generateBrushMask } from "./brushes";
import { MAX_RGB_ERROR } from "./error";
import { contourDirection } from "./gradients";
import { rgbImageData } from "./image";
import type { PainterlyRun } from "./methods/hertzmann/algorithm.cpu";

export const painterlyDebugViews: DebugViewDefinition[] = [
  { id: "blurred-reference", label: "Blurred Reference", description: "Gaussian-blurred source RGB, with transparency composited over white." },
  { id: "gradient-magnitude", label: "Gradient Magnitude", description: "Sobel magnitude of Processing brightness max(R,G,B)/255. Display scaled to this image's maximum." },
  { id: "stroke-direction-field", label: "Stroke Direction Field", description: "Sparse teal arrows follow normalize(−Iy, Ix), along contours. The gradient points across edges. Flat regions have no arrow." },
  { id: "error-before-layer", label: "Error Before Layer", description: "Squared RGB error against the current painting before this scale. Black = 0; white = 195075. Later scales include all earlier layers." },
  { id: "stroke-seeds", label: "Stroke Seeds", description: "Red marks show the maximum-error pixel chosen in each cell whose mean error exceeds the threshold." },
  { id: "canvas-after-layer", label: "Canvas After Layer", description: "Cumulative painting after this scale, including all earlier, larger brushes." },
  { id: "stroke-paths", label: "Stroke Paths", description: "Centerlines of generated strokes with red seed markers. Geometry is shown independently of brush thickness." },
  { id: "layer-strokes-only", label: "Layer Strokes Only", description: "Only this scale's new strokes on a neutral background. Smaller brushes are placed where residual error exceeds the threshold." },
  { id: "brush-mask", label: "Brush Mask", description: "The selected procedural or uploaded coverage mask. Black = M 0; white = M 1." },
];

function scalarRaster(values: Float32Array, width: number, height: number, maximum: number): RasterResult {
  const data = new Uint8ClampedArray(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    const shade = maximum > 0 ? 255 * values[i] / maximum : 0;
    data[i * 4] = shade; data[i * 4 + 1] = shade; data[i * 4 + 2] = shade; data[i * 4 + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(data, width, height) };
}

function mark(image: ImageData, x: number, y: number, color: readonly number[]) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || x >= image.width || y < 0 || y >= image.height) return;
  const i = (y * image.width + x) * 4;
  image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2];
}

function line(image: ImageData, x: number, y: number, ex: number, ey: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(ex - x, ey - y) * 2));
  for (let i = 0; i <= steps; i++) mark(image, x + (ex - x) * i / steps, y + (ey - y) * i / steps, [0, 95, 110]);
}

function directionRaster(run: PainterlyRun): RasterResult {
  const imageData = rgbImageData(run.reference);
  for (let i = 0; i < imageData.data.length; i += 4) {
    for (let c = 0; c < 3; c++) imageData.data[i + c] = imageData.data[i + c] * 0.25 + 255 * 0.75;
  }
  const spacing = Math.max(12, Math.ceil(Math.max(imageData.width, imageData.height) / 32));
  const length = spacing * 0.65;
  for (let y = Math.min(spacing / 2, imageData.height / 2); y < imageData.height; y += spacing) {
    for (let x = Math.min(spacing / 2, imageData.width / 2); x < imageData.width; x += spacing) {
      const d = contourDirection(run.field, { x, y });
      if (!d) continue;
      const sx = x - d.x * length / 2, sy = y - d.y * length / 2;
      const ex = x + d.x * length / 2, ey = y + d.y * length / 2;
      line(imageData, sx, sy, ex, ey);
      for (const sign of [-1, 1]) {
        line(imageData, ex, ey, ex - d.x * length * 0.3 + sign * -d.y * length * 0.2, ey - d.y * length * 0.3 + sign * d.x * length * 0.2);
      }
    }
  }
  return { kind: "raster", imageData };
}

function strokePaths(run: PainterlyRun): PathResult {
  const paths: PathResult["paths"] = [];
  for (const stroke of run.strokes) {
    if (!stroke.points.length) continue;
    paths.push({ points: stroke.points, stroke: "#08777a", width: 1.5, opacity: 0.88 });
    const start = stroke.points[0];
    const radius = Math.max(1.5, Math.min(4, run.settings.brushRadius * 0.16));
    const marker: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      marker.push({ x: start.x + Math.cos(angle) * radius, y: start.y + Math.sin(angle) * radius });
    }
    paths.push({ points: marker, closed: true, fill: "#e62f4a", stroke: "#7c1328", width: 0.75, opacity: 0.92 });
  }
  return { kind: "paths", width: run.reference.width, height: run.reference.height, background: "#f6f3e8", paths };
}

function brushMaskRaster(texture?: BrushTextureConfig): RasterResult {
  const fallback = texture ?? { mask: generateBrushMask("soft", 64, 64, 12345) };
  const width = fallback.mask.width;
  const height = fallback.mask.height;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const shade = Math.round(Math.max(0, Math.min(1, fallback.mask.data[i] ?? 0)) * 255);
    data[i * 4] = shade; data[i * 4 + 1] = shade; data[i * 4 + 2] = shade; data[i * 4 + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(data, width, height) };
}

export function createPainterlyDebugViews(run: PainterlyRun, canvasAfter: ImageData, texture?: BrushTextureConfig): DebugView[] {
  const { width, height } = run.reference;
  let maxGradient = 0;
  for (const value of run.field.magnitude) maxGradient = Math.max(maxGradient, value);
  const seeds = rgbImageData(run.reference);
  for (const seed of run.seeds) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy <= 4) mark(seeds, seed.x + dx, seed.y + dy, [230, 25, 55]);
      }
    }
  }
  const results = [
    { kind: "raster" as const, imageData: rgbImageData(run.reference) },
    scalarRaster(run.field.magnitude, width, height, maxGradient),
    directionRaster(run),
    scalarRaster(run.errors, width, height, MAX_RGB_ERROR),
    { kind: "raster" as const, imageData: seeds },
    { kind: "raster" as const, imageData: canvasAfter },
    strokePaths(run),
    texture ? texturedStrokeResult(width, height, run.strokes, texture, "#eeeeea") : solidStrokeResult(width, height, run.strokes, "#eeeeea"),
    brushMaskRaster(texture),
  ];
  const radius = run.settings.brushRadius;
  return painterlyDebugViews.map(({ id, label }, i) => ({
    id: `${radius}-${id}`, definitionId: id, group: `${radius} px`,
    label: `${label} (${radius} px)`, result: results[i],
  }));
}
