import { findNearestPaletteColor } from "../../nearestPaletteColor";
import type { RgbColor } from "../../palettes";
import type { RgbaImage } from "../../types";

export interface FixedPaletteResult {
  image: RgbaImage;
  errorSquared?: Float32Array;
}

export function quantizeToFixedPalette(
  source: RgbaImage,
  palette: readonly RgbColor[],
  debugEnabled = false,
): FixedPaletteResult {
  const output = new Uint8ClampedArray(source.data.length);
  const errorSquared = debugEnabled
    ? new Float32Array(source.width * source.height)
    : undefined;

  for (let pixelIndex = 0; pixelIndex < source.width * source.height; pixelIndex += 1) {
    const pixel = pixelIndex * 4;
    const nearest = findNearestPaletteColor(
      {
        red: source.data[pixel],
        green: source.data[pixel + 1],
        blue: source.data[pixel + 2],
      },
      palette,
    );

    output[pixel] = nearest.color.red;
    output[pixel + 1] = nearest.color.green;
    output[pixel + 2] = nearest.color.blue;
    output[pixel + 3] = source.data[pixel + 3];
    if (errorSquared) errorSquared[pixelIndex] = nearest.distanceSquared;
  }

  return {
    image: { width: source.width, height: source.height, data: output },
    errorSquared,
  };
}
