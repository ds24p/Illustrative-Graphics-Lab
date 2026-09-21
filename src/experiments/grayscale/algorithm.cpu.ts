import type { RasterResult } from "../../core/results/types";
import type { GrayscaleMethod, GrayscaleParameters } from "./types";

function grayscaleValue(
  red: number,
  green: number,
  blue: number,
  method: GrayscaleMethod,
) {
  if (method === "average") return (red + green + blue) / 3;
  if (method === "desaturation") {
    return (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2;
  }
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function convertToGrayscale(
  source: ImageData,
  method: GrayscaleMethod,
  parameters: GrayscaleParameters,
): RasterResult {
  const output = new Uint8ClampedArray(source.data.length);

  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index];
    const green = source.data[index + 1];
    const blue = source.data[index + 2];
    const gray = grayscaleValue(red, green, blue, method);
    const mix = parameters.intensity;

    output[index] = red + (gray - red) * mix;
    output[index + 1] = green + (gray - green) * mix;
    output[index + 2] = blue + (gray - blue) * mix;
    output[index + 3] = parameters.preserveAlpha
      ? source.data[index + 3]
      : 255;
  }

  return {
    kind: "raster",
    imageData: new ImageData(output, source.width, source.height),
  };
}

export function createTonalBands(source: ImageData): RasterResult {
  const output = new Uint8ClampedArray(source.data.length);
  const colors = [
    [28, 31, 30],
    [39, 111, 116],
    [103, 202, 196],
    [243, 186, 61],
    [244, 240, 228],
  ];

  for (let index = 0; index < source.data.length; index += 4) {
    const value = source.data[index];
    const color = colors[Math.min(colors.length - 1, Math.floor(value / 52))];
    output[index] = color[0];
    output[index + 1] = color[1];
    output[index + 2] = color[2];
    output[index + 3] = source.data[index + 3];
  }

  return {
    kind: "raster",
    imageData: new ImageData(output, source.width, source.height),
  };
}
