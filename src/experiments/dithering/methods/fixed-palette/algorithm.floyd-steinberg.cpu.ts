import { findNearestPaletteColor } from "../../nearestPaletteColor";
import type { RgbColor } from "../../palettes";
import type { RgbaImage } from "../../types";

export interface ColorFloydSteinbergResult {
  image: RgbaImage;
  errorSquared?: Float32Array;
  adjustedRgb?: Float32Array;
}

function addWeightedError(
  workingRgb: Float32Array,
  pixelIndex: number,
  errorRed: number,
  errorGreen: number,
  errorBlue: number,
  weight: number,
) {
  const target = pixelIndex * 3;
  workingRgb[target] += errorRed * weight;
  workingRgb[target + 1] += errorGreen * weight;
  workingRgb[target + 2] += errorBlue * weight;
}

export function ditherFixedPaletteFloydSteinberg(
  source: RgbaImage,
  palette: readonly RgbColor[],
  debugEnabled = false,
): ColorFloydSteinbergResult {
  const pixelCount = source.width * source.height;
  const workingRgb = new Float32Array(pixelCount * 3);
  const output = new Uint8ClampedArray(source.data.length);
  const errorSquared = debugEnabled ? new Float32Array(pixelCount) : undefined;
  const adjustedRgb = debugEnabled ? new Float32Array(pixelCount * 3) : undefined;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourcePixel = pixelIndex * 4;
    const workingPixel = pixelIndex * 3;
    workingRgb[workingPixel] = source.data[sourcePixel];
    workingRgb[workingPixel + 1] = source.data[sourcePixel + 1];
    workingRgb[workingPixel + 2] = source.data[sourcePixel + 2];
  }

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const pixelIndex = y * source.width + x;
      const workingPixel = pixelIndex * 3;
      const outputPixel = pixelIndex * 4;
      const current = {
        red: workingRgb[workingPixel],
        green: workingRgb[workingPixel + 1],
        blue: workingRgb[workingPixel + 2],
      };

      if (adjustedRgb) {
        adjustedRgb[workingPixel] = current.red;
        adjustedRgb[workingPixel + 1] = current.green;
        adjustedRgb[workingPixel + 2] = current.blue;
      }

      const nearest = findNearestPaletteColor(current, palette);
      output[outputPixel] = nearest.color.red;
      output[outputPixel + 1] = nearest.color.green;
      output[outputPixel + 2] = nearest.color.blue;
      output[outputPixel + 3] = source.data[outputPixel + 3];

      const errorRed = current.red - nearest.color.red;
      const errorGreen = current.green - nearest.color.green;
      const errorBlue = current.blue - nearest.color.blue;
      if (errorSquared) {
        errorSquared[pixelIndex] =
          errorRed * errorRed +
          errorGreen * errorGreen +
          errorBlue * errorBlue;
      }

      // Working values stay unclamped so the full signed RGB error is preserved.
      if (x + 1 < source.width) {
        addWeightedError(
          workingRgb,
          pixelIndex + 1,
          errorRed,
          errorGreen,
          errorBlue,
          7 / 16,
        );
      }
      if (y + 1 < source.height) {
        if (x > 0) {
          addWeightedError(
            workingRgb,
            pixelIndex + source.width - 1,
            errorRed,
            errorGreen,
            errorBlue,
            3 / 16,
          );
        }
        addWeightedError(
          workingRgb,
          pixelIndex + source.width,
          errorRed,
          errorGreen,
          errorBlue,
          5 / 16,
        );
        if (x + 1 < source.width) {
          addWeightedError(
            workingRgb,
            pixelIndex + source.width + 1,
            errorRed,
            errorGreen,
            errorBlue,
            1 / 16,
          );
        }
      }
    }
  }

  return {
    image: { width: source.width, height: source.height, data: output },
    errorSquared,
    adjustedRgb,
  };
}
