import {
  assertLevelsPerChannel,
  rgbLevelToByte,
} from "../../colorQuantization";
import type { RgbaImage } from "../../types";

export type BayerMatrixSize = 2 | 4 | 8;

const BAYER_RANKS: Record<BayerMatrixSize, readonly number[]> = {
  2: [0, 2, 3, 1],
  4: [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ],
  8: [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ],
};

export function parseBayerMatrixSize(value: string): BayerMatrixSize {
  const size = Number(value);
  if (size !== 2 && size !== 4 && size !== 8) {
    throw new Error("Bayer matrix size must be 2, 4, or 8.");
  }
  return size;
}

export function bayerThresholdAt(x: number, y: number, size: BayerMatrixSize) {
  const rank = BAYER_RANKS[size][(y % size) * size + (x % size)];
  return (rank + 0.5) / (size * size);
}

export function orderedDitherRgbLevels(
  source: RgbaImage,
  levels: number,
  matrixSize: BayerMatrixSize,
): RgbaImage {
  assertLevelsPerChannel(levels);
  const output = new Uint8ClampedArray(source.data.length);
  const maximumLevelIndex = levels - 1;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const pixel = (y * source.width + x) * 4;
      const threshold = bayerThresholdAt(x, y, matrixSize);

      for (let channel = 0; channel < 3; channel += 1) {
        // level = floor(c(L-1)) + [fraction(c(L-1)) > Bayer threshold].
        const scaled = (source.data[pixel + channel] / 255) * maximumLevelIndex;
        const lowerLevel = Math.floor(scaled);
        const fraction = scaled - lowerLevel;
        const levelIndex = Math.min(
          lowerLevel + (fraction > threshold ? 1 : 0),
          maximumLevelIndex,
        );
        output[pixel + channel] = rgbLevelToByte(levelIndex, levels);
      }

      output[pixel + 3] = source.data[pixel + 3];
    }
  }

  return { width: source.width, height: source.height, data: output };
}
