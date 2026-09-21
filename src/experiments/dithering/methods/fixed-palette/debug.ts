import type { DebugView, RasterResult } from "../../../../core/results/types";
import type { RgbColor } from "../../palettes";
import type { PaletteDitheringStrategy } from "./strategy";

function imageDataToRaster(source: ImageData): RasterResult {
  return {
    kind: "raster",
    imageData: new ImageData(
      new Uint8ClampedArray(source.data),
      source.width,
      source.height,
    ),
  };
}

function paletteToRaster(palette: readonly RgbColor[]): RasterResult {
  const columns = Math.min(palette.length, 8);
  const rows = Math.ceil(palette.length / columns);
  const cellSize = 48;
  const width = columns * cellSize;
  const height = rows * cellSize;
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.fill(255);

  palette.forEach((color, colorIndex) => {
    const startX = (colorIndex % columns) * cellSize;
    const startY = Math.floor(colorIndex / columns) * cellSize;
    for (let y = startY; y < startY + cellSize; y += 1) {
      for (let x = startX; x < startX + cellSize; x += 1) {
        const pixel = (y * width + x) * 4;
        pixels[pixel] = color.red;
        pixels[pixel + 1] = color.green;
        pixels[pixel + 2] = color.blue;
        pixels[pixel + 3] = 255;
      }
    }
  });

  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

function errorMagnitudeToRaster(
  errorSquared: Float32Array,
  width: number,
  height: number,
): RasterResult {
  let maximumErrorSquared = 0;
  for (const error of errorSquared) {
    maximumErrorSquared = Math.max(maximumErrorSquared, error);
  }

  const pixels = new Uint8ClampedArray(errorSquared.length * 4);
  for (let index = 0; index < errorSquared.length; index += 1) {
    const normalized = maximumErrorSquared
      ? Math.sqrt(errorSquared[index] / maximumErrorSquared)
      : 0;
    const value = Math.round(normalized * 255);
    const pixel = index * 4;
    pixels[pixel] = value;
    pixels[pixel + 1] = value;
    pixels[pixel + 2] = value;
    pixels[pixel + 3] = 255;
  }

  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function createFixedPaletteDebugViews(
  source: ImageData,
  palette: readonly RgbColor[],
  quantizedWithoutDiffusion: RasterResult,
  finalOutput: RasterResult,
  errorSquared: Float32Array,
  strategy: PaletteDitheringStrategy,
  paletteLabel = "Palette swatches",
): DebugView[] {
  const views: DebugView[] = [
    { id: "original", label: "Original", result: imageDataToRaster(source) },
    {
      id: "palette-swatches",
      label: `${paletteLabel} (${palette.length} colors)`,
      result: paletteToRaster(palette),
    },
    {
      id: "quantized-without-diffusion",
      label:
        strategy === "none" ? "Quantized result" : "Quantized without diffusion",
      result: quantizedWithoutDiffusion,
    },
  ];

  if (strategy === "floyd-steinberg") {
    views.push({
      id: "final-floyd-steinberg-result",
      label: "Final Floyd-Steinberg result",
      result: finalOutput,
    });
  }

  views.push({
    id: "color-error-magnitude",
    label: "RGB error magnitude",
    result: errorMagnitudeToRaster(errorSquared, source.width, source.height),
  });

  return views;
}
