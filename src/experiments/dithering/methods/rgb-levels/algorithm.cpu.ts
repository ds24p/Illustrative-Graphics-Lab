import {
  assertLevelsPerChannel,
  rgbLevelToByte,
} from "../../colorQuantization";
import type { RgbaImage } from "../../types";

export function quantizeRgbLevels(
  source: RgbaImage,
  levels: number,
): RgbaImage {
  assertLevelsPerChannel(levels);
  const output = new Uint8ClampedArray(source.data.length);
  const maximumLevelIndex = levels - 1;

  for (let pixel = 0; pixel < source.data.length; pixel += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const normalized = source.data[pixel + channel] / 255;
      const levelIndex = Math.round(normalized * maximumLevelIndex);
      output[pixel + channel] = rgbLevelToByte(levelIndex, levels);
    }
    output[pixel + 3] = source.data[pixel + 3];
  }

  return { width: source.width, height: source.height, data: output };
}
