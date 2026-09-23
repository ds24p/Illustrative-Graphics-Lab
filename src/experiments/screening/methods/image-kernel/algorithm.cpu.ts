import type {
  ImageKernelScreeningResult,
  IntensityImage,
  ScreeningKernel,
} from "../../types";

function validateInput(source: IntensityImage, kernel: ScreeningKernel) {
  if (
    source.width < 1 ||
    source.height < 1 ||
    source.values.length !== source.width * source.height
  ) {
    throw new Error("The source intensity image is invalid.");
  }

  if (
    kernel.width < 1 ||
    kernel.height < 1 ||
    kernel.values.length !== kernel.width * kernel.height
  ) {
    throw new Error("The screening kernel is invalid.");
  }
}

export function screenWithImageKernel(
  source: IntensityImage,
  kernel: ScreeningKernel,
  debugEnabled = false,
): ImageKernelScreeningResult {
  validateInput(source, kernel);

  const output = new Uint8Array(source.values.length);
  const tiledKernel = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;
  const thresholdField = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;

  for (let y = 0; y < source.height; y += 1) {
    const kernelY = y % kernel.height;
    for (let x = 0; x < source.width; x += 1) {
      const index = y * source.width + x;
      const kernelX = x % kernel.width;
      const kernelValue = kernel.values[kernelY * kernel.width + kernelX];
      const threshold = 1 - kernelValue;

      // The strict comparison preserves the Processing sketch: equality is white.
      output[index] = source.values[index] < threshold ? 0 : 1;
      if (tiledKernel && thresholdField) {
        tiledKernel[index] = kernelValue;
        thresholdField[index] = threshold;
      }
    }
  }

  return {
    image: { width: source.width, height: source.height, values: output },
    debug:
      tiledKernel && thresholdField ? { tiledKernel, thresholdField } : undefined,
  };
}
