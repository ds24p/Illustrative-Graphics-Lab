import type { ExperimentResultRenderer } from "../../../core/rendering/types";
import type { StrokeMark, StrokeResult } from "../../../core/results/types";
import type { PainterlyStroke, PaintingSurfaceFactory } from "../types";

export function solidStrokeResult(width: number, height: number, strokes: PainterlyStroke[], background = "#ffffff"): StrokeResult {
  return {
    kind: "strokes", width, height, background,
    strokes: strokes.map((stroke) => ({
      points: stroke.points,
      width: stroke.radius * 2,
      color: `rgb(${stroke.color.r} ${stroke.color.g} ${stroke.color.b})`,
      opacity: stroke.opacity,
    })),
  };
}

// Midpoint quadratic curves stay inside the control-point convex hull, including at image edges.
// Does not clear the canvas: feedback painting, preview, and export use this same drawing code.
export function drawSolidStrokes(context: CanvasRenderingContext2D, strokes: StrokeMark[]) {
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of strokes) {
    if (!stroke.points.length || stroke.width <= 0) continue;
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.globalAlpha = stroke.opacity ?? 1;
    context.beginPath();
    const first = stroke.points[0];
    if (stroke.points.length === 1) {
      // Tiny images or boundary seeds can have no room for a segment: render a visible round dab.
      context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }
    context.moveTo(first.x, first.y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const current = stroke.points[i], next = stroke.points[i + 1];
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = stroke.points[stroke.points.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
  }
  context.globalAlpha = 1;
}

export const renderSolidStrokes: ExperimentResultRenderer = (result, { canvas }) => {
  if (result.kind !== "strokes") throw new Error("The solid brush renderer requires strokes.");
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create a 2D canvas context.");
  context.globalAlpha = 1;
  context.fillStyle = result.background ?? "#ffffff";
  context.fillRect(0, 0, result.width, result.height);
  drawSolidStrokes(context, result.strokes);
};

export const createSolidPaintingSurface: PaintingSurfaceFactory = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not create a 2D painting canvas.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  return {
    drawLayer: (strokes) => drawSolidStrokes(context, solidStrokeResult(width, height, strokes).strokes),
    snapshot: () => context.getImageData(0, 0, width, height),
  };
};
