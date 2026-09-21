import type { ParameterDefinition } from "../../core/parameters/types";
import { builtInPalettes, defaultCustomPalette } from "./palettes";

export const thresholdParameters: ParameterDefinition[] = [
  {
    key: "threshold",
    kind: "range",
    label: "Threshold",
    description: "Values at or above the threshold become white.",
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
];

export const randomThresholdParameters: ParameterDefinition[] = [
  ...thresholdParameters,
  {
    key: "randomAmplitude",
    kind: "range",
    label: "Random threshold amplitude",
    description: "The default 0.5 reproduces the original [-0.5, +0.5] offset.",
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "randomSeed",
    kind: "integer",
    label: "Random seed",
    description: "Combined with pixel coordinates to reproduce the same pattern.",
    defaultValue: 12345,
    min: 0,
    max: 4294967295,
  },
];

export const lineParameters: ParameterDefinition[] = [
  {
    key: "lineLength",
    kind: "integer",
    label: "Line length",
    description: "Pixels are drawn diagonally from the seed toward the upper-left.",
    defaultValue: 3,
    min: 1,
    max: 32,
  },
];

export const rgbLevelsParameters: ParameterDefinition[] = [
  {
    key: "levelsPerChannel",
    kind: "integer",
    label: "Levels per channel",
    description: "Each RGB channel uses L levels, allowing up to L^3 colors.",
    defaultValue: 4,
    min: 2,
    max: 8,
  },
];

export const orderedRgbLevelsParameters: ParameterDefinition[] = [
  ...rgbLevelsParameters,
  {
    key: "bayerMatrixSize",
    kind: "select",
    label: "Bayer matrix size",
    description: "The threshold pattern repeats across the image.",
    defaultValue: "4",
    options: [
      { value: "2", label: "2 x 2" },
      { value: "4", label: "4 x 4" },
      { value: "8", label: "8 x 8" },
    ],
  },
];

export const paletteDitheringStrategyParameter: ParameterDefinition = {
  key: "paletteDitheringStrategy",
  kind: "select",
  label: "Dithering strategy",
  description: "Choose direct quantization or raster-order RGB error diffusion.",
  defaultValue: "none",
  options: [
    { value: "none", label: "None" },
    { value: "floyd-steinberg", label: "Floyd-Steinberg" },
  ],
};

export const fixedPaletteParameters: ParameterDefinition[] = [
  {
    key: "palette",
    kind: "select",
    label: "Palette",
    description: "Every source pixel is mapped to its nearest listed RGB color.",
    defaultValue: "warm-cool",
    options: [
      ...builtInPalettes.map(({ id, label }) => ({ value: id, label })),
      { value: "custom", label: "Custom Palette" },
    ],
  },
  paletteDitheringStrategyParameter,
  {
    key: "customPalette",
    kind: "color-list",
    label: "Custom palette colors",
    description: "Colors are evaluated in this order; the first wins a tie.",
    defaultValue: defaultCustomPalette,
    defaultNewColor: "#ffffff",
    minItems: 1,
    maxItems: 16,
    visibleWhen: { parameter: "palette", equals: "custom" },
  },
];

export const medianCutParameters: ParameterDefinition[] = [
  {
    key: "paletteSize",
    kind: "integer",
    label: "Palette size",
    description: "Requested number of colors generated from the source image.",
    defaultValue: 8,
    min: 2,
    max: 32,
  },
  paletteDitheringStrategyParameter,
];
