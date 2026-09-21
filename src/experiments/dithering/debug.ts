import type { DebugView, RasterResult } from "../../core/results/types";
import type {
  BinaryImage,
  DiffusionDebugData,
  IntensityImage,
} from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function binaryImageToRaster(image: BinaryImage): RasterResult {
  const pixels = new Uint8ClampedArray(image.values.length * 4);
  for (let index = 0; index < image.values.length; index += 1) {
    const value = image.values[index] * 255;
    const pixel = index * 4;
    pixels[pixel] = value;
    pixels[pixel + 1] = value;
    pixels[pixel + 2] = value;
    pixels[pixel + 3] = 255;
  }
  return {
    kind: "raster",
    imageData: new ImageData(pixels, image.width, image.height),
  };
}

export function scalarImageToRaster(
  values: Float32Array,
  width: number,
  height: number,
): RasterResult {
  const pixels = new Uint8ClampedArray(values.length * 4);
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.round(clamp01(values[index]) * 255);
    const pixel = index * 4;
    pixels[pixel] = value;
    pixels[pixel + 1] = value;
    pixels[pixel + 2] = value;
    pixels[pixel + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

function signedErrorToRaster(
  values: Float32Array,
  width: number,
  height: number,
): RasterResult {
  let maxMagnitude = 0;
  for (const value of values) maxMagnitude = Math.max(maxMagnitude, Math.abs(value));
  const scale = maxMagnitude || 1;
  const pixels = new Uint8ClampedArray(values.length * 4);

  for (let index = 0; index < values.length; index += 1) {
    const normalized = Math.min(1, Math.abs(values[index]) / scale);
    const pixel = index * 4;
    const target = values[index] < 0 ? [232, 90, 71] : [8, 127, 124];
    pixels[pixel] = 244 + (target[0] - 244) * normalized;
    pixels[pixel + 1] = 244 + (target[1] - 244) * normalized;
    pixels[pixel + 2] = 240 + (target[2] - 240) * normalized;
    pixels[pixel + 3] = 255;
  }

  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function seedMaskToRaster(
  seeds: Uint8Array,
  width: number,
  height: number,
): RasterResult {
  const pixels = new Uint8ClampedArray(seeds.length * 4);
  for (let index = 0; index < seeds.length; index += 1) {
    const pixel = index * 4;
    const value = seeds[index] ? 18 : 255;
    pixels[pixel] = value;
    pixels[pixel + 1] = value;
    pixels[pixel + 2] = value;
    pixels[pixel + 3] = 255;
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function coverageToRaster(
  coverage: Uint16Array,
  width: number,
  height: number,
): RasterResult {
  let maximum = 0;
  for (const count of coverage) maximum = Math.max(maximum, count);
  const scale = maximum || 1;
  const pixels = new Uint8ClampedArray(coverage.length * 4);

  for (let index = 0; index < coverage.length; index += 1) {
    const amount = coverage[index] / scale;
    const pixel = index * 4;
    pixels[pixel] = 255 - 23 * amount;
    pixels[pixel + 1] = 255 - 181 * amount;
    pixels[pixel + 2] = 255 - 199 * amount;
    pixels[pixel + 3] = 255;
  }

  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function createDiffusionDebugViews(
  debug: DiffusionDebugData | undefined,
  width: number,
  height: number,
): DebugView[] {
  if (!debug?.adjustedIntensity || !debug.incomingError) return [];

  return [
    {
      id: "adjusted-intensity",
      label: "Adjusted intensity when visited",
      result: scalarImageToRaster(debug.adjustedIntensity, width, height),
    },
    {
      id: "incoming-error",
      label: "Accumulated incoming error",
      result: signedErrorToRaster(debug.incomingError, width, height),
    },
  ];
}

export function createDitheringDebugViews(
  source: ImageData,
  intensity: IntensityImage,
  output: RasterResult,
  intermediateViews: DebugView[] = [],
): DebugView[] {
  return [
    {
      id: "original",
      label: "Original",
      result: {
        kind: "raster",
        imageData: new ImageData(
          new Uint8ClampedArray(source.data),
          source.width,
          source.height,
        ),
      },
    },
    {
      id: "source-intensity",
      label: "Source intensity (Processing brightness)",
      result: scalarImageToRaster(intensity.values, intensity.width, intensity.height),
    },
    ...intermediateViews,
    { id: "final-result", label: "Final result", result: output },
  ];
}
