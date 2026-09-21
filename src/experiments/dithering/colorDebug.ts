import type { DebugView, RasterResult } from "../../core/results/types";
import { rgbLevelToByte } from "./colorQuantization";
import {
  bayerThresholdAt,
  type BayerMatrixSize,
} from "./methods/rgb-levels-ordered/algorithm.cpu";
import type { RgbaImage } from "./types";

export function imageDataAsRgbaImage(imageData: ImageData): RgbaImage {
  return {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };
}

export function rgbaImageToRaster(image: RgbaImage): RasterResult {
  return {
    kind: "raster",
    imageData: new ImageData(
      new Uint8ClampedArray(image.data),
      image.width,
      image.height,
    ),
  };
}

function originalToRaster(source: ImageData): RasterResult {
  return {
    kind: "raster",
    imageData: new ImageData(
      new Uint8ClampedArray(source.data),
      source.width,
      source.height,
    ),
  };
}

function createRgbLevelPalette(levels: number): RasterResult {
  const colorCount = levels ** 3;
  const columns = Math.ceil(Math.sqrt(colorCount));
  const rows = Math.ceil(colorCount / columns);
  const cellSize = levels <= 4 ? 28 : 18;
  const width = columns * cellSize;
  const height = rows * cellSize;
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.fill(255);

  let colorIndex = 0;
  for (let red = 0; red < levels; red += 1) {
    for (let green = 0; green < levels; green += 1) {
      for (let blue = 0; blue < levels; blue += 1) {
        const startX = (colorIndex % columns) * cellSize;
        const startY = Math.floor(colorIndex / columns) * cellSize;
        const color = [
          rgbLevelToByte(red, levels),
          rgbLevelToByte(green, levels),
          rgbLevelToByte(blue, levels),
        ];

        for (let y = startY; y < startY + cellSize; y += 1) {
          for (let x = startX; x < startX + cellSize; x += 1) {
            const pixel = (y * width + x) * 4;
            pixels[pixel] = color[0];
            pixels[pixel + 1] = color[1];
            pixels[pixel + 2] = color[2];
            pixels[pixel + 3] = 255;
          }
        }
        colorIndex += 1;
      }
    }
  }

  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

function createBayerPattern(size: BayerMatrixSize): RasterResult {
  const cellSize = 32;
  const dimension = size * cellSize;
  const pixels = new Uint8ClampedArray(dimension * dimension * 4);

  for (let y = 0; y < dimension; y += 1) {
    for (let x = 0; x < dimension; x += 1) {
      const threshold = bayerThresholdAt(
        Math.floor(x / cellSize),
        Math.floor(y / cellSize),
        size,
      );
      const value = Math.round(threshold * 255);
      const pixel = (y * dimension + x) * 4;
      pixels[pixel] = value;
      pixels[pixel + 1] = value;
      pixels[pixel + 2] = value;
      pixels[pixel + 3] = 255;
    }
  }

  return {
    kind: "raster",
    imageData: new ImageData(pixels, dimension, dimension),
  };
}

export function createRgbLevelsDebugViews(
  source: ImageData,
  output: RasterResult,
  levels: number,
): DebugView[] {
  return [
    { id: "original", label: "Original", result: originalToRaster(source) },
    { id: "quantized-result", label: "Quantized result", result: output },
    {
      id: "rgb-level-palette",
      label: `Available RGB levels (${levels ** 3} colors)`,
      result: createRgbLevelPalette(levels),
    },
  ];
}

export function createOrderedRgbLevelsDebugViews(
  source: ImageData,
  quantizedWithoutDithering: RgbaImage,
  matrixSize: BayerMatrixSize,
  output: RasterResult,
): DebugView[] {
  return [
    { id: "original", label: "Original", result: originalToRaster(source) },
    {
      id: "quantized-without-dithering",
      label: "Quantized result without dithering",
      result: rgbaImageToRaster(quantizedWithoutDithering),
    },
    {
      id: "bayer-threshold-pattern",
      label: `${matrixSize} x ${matrixSize} Bayer threshold pattern`,
      result: createBayerPattern(matrixSize),
    },
    { id: "final-result", label: "Final ordered-dithered result", result: output },
  ];
}
