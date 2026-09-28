import type { ExperimentRendererMap } from "./types";
import type { ExperimentResult, PointResult, RasterResult } from "../results/types";

function renderRaster(result: RasterResult, canvas: HTMLCanvasElement) {
  canvas.width = result.imageData.width;
  canvas.height = result.imageData.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not create a 2D canvas context.");
  }
  context.putImageData(result.imageData, 0, 0);
}

function renderPoints(result: PointResult, canvas: HTMLCanvasElement) {
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not create a 2D canvas context.");
  }

  context.fillStyle = result.background ?? "#fff";
  context.fillRect(0, 0, result.width, result.height);
  for (const point of result.points) {
    const radius = point.radius ?? 1;
    if (radius <= 0) continue;
    context.fillStyle = point.color ?? "#000";
    context.globalAlpha = point.opacity ?? 1;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function renderPaths(result: Extract<ExperimentResult, { kind: "paths" }>, canvas: HTMLCanvasElement) {
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create a 2D canvas context.");
  context.fillStyle = result.background ?? "#fff";
  context.fillRect(0, 0, result.width, result.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const path of result.paths) {
    if (!path.points.length) continue;
    context.beginPath();
    context.moveTo(path.points[0].x, path.points[0].y);
    for (const point of path.points.slice(1)) context.lineTo(point.x, point.y);
    if (path.closed) context.closePath();
    context.globalAlpha = path.opacity ?? 1;
    if (path.fill) {
      context.fillStyle = path.fill;
      context.fill();
    }
    if (path.stroke && (path.width ?? 1) > 0) {
      context.strokeStyle = path.stroke;
      context.lineWidth = path.width ?? 1;
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}

export function renderExperimentResult(
  result: ExperimentResult,
  canvas: HTMLCanvasElement,
  customRenderers?: ExperimentRendererMap,
) {
  const customRenderer = customRenderers?.[result.kind];
  if (customRenderer) {
    customRenderer(result, { canvas });
    return;
  }

  if (result.kind === "raster") {
    renderRaster(result, canvas);
    return;
  }

  if (result.kind === "points") {
    renderPoints(result, canvas);
    return;
  }

  if (result.kind === "paths") {
    renderPaths(result, canvas);
    return;
  }

  throw new Error(`No renderer is registered for ${result.kind} results yet.`);
}
