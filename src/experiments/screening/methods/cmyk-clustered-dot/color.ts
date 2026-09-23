import type { CmykColor, NormalizedRgbColor } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function rgbToCmyk(
  red: number,
  green: number,
  blue: number,
): CmykColor {
  const r = clamp01(red);
  const g = clamp01(green);
  const b = clamp01(blue);
  const black = 1 - Math.max(r, g, b);

  if (black >= 1) {
    return { cyan: 0, magenta: 0, yellow: 0, black: 1 };
  }

  const remaining = 1 - black;
  return {
    cyan: clamp01((1 - r - black) / remaining),
    magenta: clamp01((1 - g - black) / remaining),
    yellow: clamp01((1 - b - black) / remaining),
    black: clamp01(black),
  };
}

export function combineIdealCmykMasks(
  cyanInk: number,
  magentaInk: number,
  yellowInk: number,
  blackInk: number,
): NormalizedRgbColor {
  return {
    red: (1 - cyanInk) * (1 - blackInk),
    green: (1 - magentaInk) * (1 - blackInk),
    blue: (1 - yellowInk) * (1 - blackInk),
  };
}
