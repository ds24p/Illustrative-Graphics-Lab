import type { ExperimentBackend } from "../../../../core/backends/types";
import type { DebugView } from "../../../../core/results/types";
import { createPainterlyDebugViews } from "../../debug";
import { createSolidPaintingSurface, solidStrokeResult } from "../../renderers/solid";
import { createTexturedPaintingSurface, texturedStrokeResult } from "../../renderers/textured";
import { resolveBrushTexture } from "../../parameters";
import type { PainterlyParameters } from "../../types";
import { paintMultiScale } from "./algorithm.cpu";

export const hertzmannCpuBackend: ExperimentBackend<PainterlyParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled, signal }) {
    signal?.throwIfAborted();
    const texture = resolveBrushTexture(parameters);
    const createSurface = texture
      ? (width: number, height: number) => createTexturedPaintingSurface(width, height, texture)
      : createSolidPaintingSurface;
    const debugViews: DebugView[] | undefined = debugEnabled ? [] : undefined;
    const run = await paintMultiScale(source.imageData, parameters, createSurface,
      debugViews ? (layer, canvasAfter) => debugViews.push(...createPainterlyDebugViews(layer, canvasAfter, texture)) : undefined,
      signal);
    const output = texture
      ? texturedStrokeResult(source.imageData.width, source.imageData.height, run.strokes, texture)
      : solidStrokeResult(source.imageData.width, source.imageData.height, run.strokes);
    return {
      output, debugViews,
      statistics: [
        { label: "Stroke renderer", value: texture ? `Textured · ${texture.type}` : "Solid" },
        { label: "Brush order", value: run.brushRadii.map((radius) => `${radius} px`).join(" → ") },
        { label: "Total strokes", value: run.strokes.length.toLocaleString() },
        { label: "Total processing time", value: `${run.totalMs.toFixed(1)} ms` },
        ...run.layers.map((layer) => ({
          label: `Radius ${layer.radius} px`,
          value: `${layer.strokeCount.toLocaleString()} strokes\nAverage stroke length: ${layer.averageSegments.toFixed(2)} segments\n≈ ${layer.averagePixelLength.toFixed(1)} px\nBlur σ: ${Number(layer.sigma.toFixed(2))} px\nGrid: ${layer.gridSpacing} px; step: ${layer.step} px\nTime: ${layer.processingMs.toFixed(1)} ms`,
        })),
      ],
      stageTimings: run.stageTimings,
    };
  },
};
