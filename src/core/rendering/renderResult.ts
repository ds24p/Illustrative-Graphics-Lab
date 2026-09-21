import type { ExperimentRendererMap } from "./types";
import type { ExperimentResult, RasterResult } from "../results/types";

function renderRaster(result: RasterResult, canvas: HTMLCanvasElement) {
  canvas.width = result.imageData.width;
  canvas.height = result.imageData.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not create a 2D canvas context.");
  }
  context.putImageData(result.imageData, 0, 0);
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

  throw new Error(`No renderer is registered for ${result.kind} results yet.`);
}
