import type { RgbColor } from "./palettes";

export interface NearestPaletteColor {
  color: RgbColor;
  index: number;
  distanceSquared: number;
}

export function squaredRgbDistance(first: RgbColor, second: RgbColor) {
  const redDifference = first.red - second.red;
  const greenDifference = first.green - second.green;
  const blueDifference = first.blue - second.blue;
  return (
    redDifference * redDifference +
    greenDifference * greenDifference +
    blueDifference * blueDifference
  );
}

export function findNearestPaletteColor(
  source: RgbColor,
  palette: readonly RgbColor[],
): NearestPaletteColor {
  if (palette.length === 0) throw new Error("The palette cannot be empty.");

  let nearestIndex = 0;
  let nearestDistanceSquared = squaredRgbDistance(source, palette[0]);

  for (let index = 1; index < palette.length; index += 1) {
    const distanceSquared = squaredRgbDistance(source, palette[index]);
    // Strict comparison makes ties deterministic: the first palette color wins.
    if (distanceSquared < nearestDistanceSquared) {
      nearestIndex = index;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return {
    color: palette[nearestIndex],
    index: nearestIndex,
    distanceSquared: nearestDistanceSquared,
  };
}
