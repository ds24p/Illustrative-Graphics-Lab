import type { ImageSource } from "../../../../core/images/types";
import { normalizeKernelImage } from "../../kernelNormalization";
import { loadBuiltInKernelImage } from "../../kernels/catalog";
import type { ScreeningParameters } from "../../types";

function isImageSource(value: unknown): value is ImageSource {
  return Boolean(
    value &&
      typeof value === "object" &&
      "imageData" in value &&
      "previewUrl" in value,
  );
}

export async function resolveScreeningKernel(parameters: ScreeningParameters) {
  const kernelImage =
    parameters.kernelSource === "built-in"
      ? await loadBuiltInKernelImage(parameters.builtInKernel)
      : isImageSource(parameters.customKernel)
        ? parameters.customKernel.imageData
        : undefined;

  if (!kernelImage) {
    throw new Error("Upload a custom kernel image before running the experiment.");
  }

  return normalizeKernelImage(
    kernelImage,
    parameters.kernelWidth,
    parameters.kernelHeight,
  );
}
