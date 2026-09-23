import type { DebugView, RasterResult } from "../../core/results/types";
import type {
  BinaryImage,
  ImageKernelDebugData,
  IntensityImage,
  ScreeningKernel,
} from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function scalarImageToRaster(
  values: Float32Array,
  width: number,
  height: number,
): RasterResult {
  const pixels = new Uint8ClampedArray(values.length * 4);
  for (let index = 0; index < values.length; index += 1) {
    const gray = Math.round(clamp01(values[index]) * 255);
    const pixel = index * 4;
    pixels[pixel] = gray;
    pixels[pixel + 1] = gray;
    pixels[pixel + 2] = gray;
    pixels[pixel + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function binaryImageToRaster(image: BinaryImage): RasterResult {
  return scalarImageToRaster(
    Float32Array.from(image.values),
    image.width,
    image.height,
  );
}

export function imageDataToRaster(source: ImageData): RasterResult {
  return {
    kind: "raster",
    imageData: new ImageData(
      new Uint8ClampedArray(source.data),
      source.width,
      source.height,
    ),
  };
}

function magnifyKernel(kernel: ScreeningKernel): RasterResult {
  const scale = Math.max(
    1,
    Math.floor(256 / Math.max(kernel.width, kernel.height)),
  );
  const width = kernel.width * scale;
  const height = kernel.height * scale;
  const values = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const kernelY = Math.floor(y / scale);
    for (let x = 0; x < width; x += 1) {
      const kernelX = Math.floor(x / scale);
      values[y * width + x] =
        kernel.values[kernelY * kernel.width + kernelX];
    }
  }

  return scalarImageToRaster(values, width, height);
}

export function createScreeningDebugViews(
  source: ImageData,
  intensity: IntensityImage,
  kernel: ScreeningKernel,
  debug: ImageKernelDebugData,
  output: RasterResult,
): DebugView[] {
  return [
    {
      id: "original",
      label: "Original",
      result: imageDataToRaster(source),
    },
    {
      id: "processing-brightness",
      label: "Processing brightness",
      result: scalarImageToRaster(
        intensity.values,
        intensity.width,
        intensity.height,
      ),
    },
    {
      id: "normalized-kernel",
      label: `Normalized kernel (${kernel.width} x ${kernel.height}, magnified)`,
      result: magnifyKernel(kernel),
    },
    {
      id: "tiled-kernel",
      label: "Tiled kernel",
      result: scalarImageToRaster(
        debug.tiledKernel,
        intensity.width,
        intensity.height,
      ),
    },
    {
      id: "threshold-field",
      label: "Threshold field (1 - tiled kernel)",
      result: scalarImageToRaster(
        debug.thresholdField,
        intensity.width,
        intensity.height,
      ),
    },
    { id: "final-result", label: "Final result", result: output },
  ];
}
