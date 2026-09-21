export function assertLevelsPerChannel(levels: number) {
  if (!Number.isInteger(levels) || levels < 2 || levels > 256) {
    throw new Error("Levels per channel must be an integer from 2 to 256.");
  }
}

export function rgbLevelToByte(levelIndex: number, levels: number) {
  return Math.round((levelIndex * 255) / (levels - 1));
}

export function quantizeRgbChannel(channel: number, levels: number) {
  assertLevelsPerChannel(levels);
  const levelIndex = Math.round((channel / 255) * (levels - 1));
  return rgbLevelToByte(levelIndex, levels);
}
