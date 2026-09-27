import type { ExperimentBackend } from "../../../../core/backends/types";
import { createPainterlyDebugViews } from "../../debug";
import { solidStrokeResult } from "../../renderers/solid";
import type { PainterlyParameters } from "../../types";
import { paintSingleScale } from "./algorithm.cpu";

export const hertzmannCpuBackend: ExperimentBackend<PainterlyParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled, signal }) {
    signal?.throwIfAborted();
    const run = paintSingleScale(source.imageData, parameters);
    const output = solidStrokeResult(run.reference.width, run.reference.height, run.strokes);
    const debugStart = performance.now();
    const debugViews = debugEnabled ? createPainterlyDebugViews(run, output) : undefined;
    return {
      output, debugViews,
      statistics: [
        { label: "Strategy", value: "Single-scale curved strokes (Phase 1A)" },
        { label: "Strokes", value: run.strokes.length.toLocaleString() },
        { label: "Segments", value: run.strokes.reduce((sum, stroke) => sum + stroke.points.length - 1, 0).toLocaleString() },
        { label: "Boundary dabs", value: run.strokes.filter((stroke) => stroke.points.length === 1).length.toLocaleString() },
        { label: "Step / grid / blur σ", value: `${run.settings.step} / ${run.settings.gridSpacing} / ${Number(run.settings.sigma.toFixed(2))} px` },
      ],
      stageTimings: { ...run.timings, ...(debugEnabled ? { "Debug views": performance.now() - debugStart } : {}) },
    };
  },
};
