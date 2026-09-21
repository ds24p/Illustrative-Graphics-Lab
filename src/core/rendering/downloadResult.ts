import type { ExperimentResult } from "../results/types";
import type { ExperimentRendererMap } from "./types";
import { renderExperimentResult } from "./renderResult";

export async function downloadResultAsPng(
  result: ExperimentResult,
  filename: string,
  customRenderers?: ExperimentRendererMap,
) {
  const canvas = document.createElement("canvas");
  renderExperimentResult(result, canvas, customRenderers);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("The canvas could not be exported as PNG."));
    }, "image/png");
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
