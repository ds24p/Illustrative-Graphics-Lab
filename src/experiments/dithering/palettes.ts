export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface PaletteDefinition {
  id: string;
  label: string;
  colors: RgbColor[];
}

const rgb = (red: number, green: number, blue: number): RgbColor => ({
  red,
  green,
  blue,
});

export const builtInPalettes: PaletteDefinition[] = [
  {
    id: "black-white",
    label: "Black & White",
    colors: [rgb(0, 0, 0), rgb(255, 255, 255)],
  },
  {
    id: "simple-rgb",
    label: "Simple RGB (8 colors)",
    colors: [
      rgb(0, 0, 0),
      rgb(255, 0, 0),
      rgb(0, 255, 0),
      rgb(0, 0, 255),
      rgb(255, 255, 0),
      rgb(255, 0, 255),
      rgb(0, 255, 255),
      rgb(255, 255, 255),
    ],
  },
  {
    id: "grayscale",
    label: "Grayscale (5 colors)",
    colors: [
      rgb(0, 0, 0),
      rgb(64, 64, 64),
      rgb(128, 128, 128),
      rgb(192, 192, 192),
      rgb(255, 255, 255),
    ],
  },
  {
    id: "warm-cool",
    label: "Warm / Cool Illustrative",
    colors: [
      rgb(27, 42, 65),
      rgb(63, 140, 142),
      rgb(168, 218, 220),
      rgb(244, 233, 205),
      rgb(233, 160, 59),
      rgb(217, 93, 57),
      rgb(122, 62, 62),
      rgb(45, 36, 36),
    ],
  },
];

export const defaultCustomPalette = [
  "#1b2a41",
  "#3f8c8e",
  "#e9a03b",
  "#d95d39",
];

export function hexColorToRgb(hex: string): RgbColor {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Invalid palette color: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  return rgb((value >> 16) & 255, (value >> 8) & 255, value & 255);
}

export function resolvePalette(
  paletteId: string,
  customColors: string[],
): RgbColor[] {
  if (paletteId === "custom") {
    if (customColors.length === 0) {
      throw new Error("A custom palette needs at least one color.");
    }
    return customColors.map(hexColorToRgb);
  }

  const palette = builtInPalettes.find((candidate) => candidate.id === paletteId);
  if (!palette) throw new Error(`Unknown palette: ${paletteId}`);
  return palette.colors;
}
