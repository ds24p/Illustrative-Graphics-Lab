import type { ExperimentParameters } from "../../../core/parameters/types";
import { scalarImageToRaster } from "../debug";
import { resolveScreeningKernel } from "../methods/image-kernel/kernel";
import type { ScreeningParameters } from "../types";

export async function resolveBuiltInKernelPreview(
  selectedValue: string,
  values: ExperimentParameters,
) {
  const kernel = await resolveScreeningKernel({
    ...values,
    kernelSource: "built-in",
    builtInKernel: selectedValue,
  } as ScreeningParameters);
  const raster = scalarImageToRaster(kernel.values, kernel.width, kernel.height);
  const canvas = document.createElement("canvas");
  canvas.width = kernel.width;
  canvas.height = kernel.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the kernel preview.");
  context.putImageData(raster.imageData, 0, 0);

  return {
    src: canvas.toDataURL("image/png"),
    label: `Effective ${kernel.width} x ${kernel.height} kernel (grayscale)`,
  };
}
