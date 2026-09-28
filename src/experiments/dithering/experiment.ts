import type { ExperimentDefinition } from "../../core/experiments/types";
import { floydSteinberg1DCpuBackend } from "./methods/floyd-steinberg-1d/backend.cpu";
import { floydSteinberg2DCpuBackend } from "./methods/floyd-steinberg-2d/backend.cpu";
import { floydSteinbergLinesCpuBackend } from "./methods/floyd-steinberg-lines/backend.cpu";
import { fixedPaletteCpuBackend } from "./methods/fixed-palette/backend.cpu";
import { medianCutCpuBackend } from "./methods/median-cut/backend.cpu";
import { randomThresholdCpuBackend } from "./methods/random-threshold/backend.cpu";
import { randomThresholdWebGpuBackend } from "./methods/random-threshold/backend.webgpu";
import { orderedRgbLevelsCpuBackend } from "./methods/rgb-levels-ordered/backend.cpu";
import { orderedRgbLevelsWebGpuBackend } from "./methods/rgb-levels-ordered/backend.webgpu";
import { rgbLevelsCpuBackend } from "./methods/rgb-levels/backend.cpu";
import { rgbLevelsWebGpuBackend } from "./methods/rgb-levels/backend.webgpu";
import { thresholdCpuBackend } from "./methods/threshold/backend.cpu";
import { thresholdWebGpuBackend } from "./methods/threshold/backend.webgpu";
import {
  fixedPaletteParameters,
  lineParameters,
  medianCutParameters,
  orderedRgbLevelsParameters,
  randomThresholdParameters,
  rgbLevelsParameters,
  thresholdParameters,
} from "./parameters";
import type { DitheringParameters } from "./types";
import { ditheringEducation } from "./education";

const diffusionDebugViews = [
  {
    id: "adjusted-intensity",
    label: "Adjusted intensity when visited",
    description: "The working intensity at each pixel's turn in raster order.",
  },
  {
    id: "incoming-error",
    label: "Accumulated incoming error",
    description: "Signed error received before each quantization decision.",
  },
];

const originalDebugView = {
  id: "original",
  label: "Original",
  description: "The immutable uploaded or sample image.",
};

const sourceIntensityDebugView = {
  id: "source-intensity",
  label: "Source intensity (Processing brightness)",
  description: "HSV/HSB brightness, equivalent to the maximum RGB channel.",
};

const finalResultDebugView = {
  id: "final-result",
  label: "Final result",
  description: "The same raster shown in the main output panel.",
};

const binaryDebugViews = [
  originalDebugView,
  sourceIntensityDebugView,
  finalResultDebugView,
];

export const ditheringExperiment: ExperimentDefinition<DitheringParameters> = {
  metadata: {
    id: "dithering",
    title: "Dithering / Halftoning",
    summary:
      "Compare black-and-white halftoning, color quantization, palette diffusion, and automatic palette generation.",
    category: "Illustrative image processing",
    tags: [
      "raster",
      "halftoning",
      "color quantization",
      "error diffusion",
      "median cut",
    ],
  },
  description: {
    overview:
      "The methods progress from scalar thresholding to RGB and palette-based color reduction. RGB Levels uses a regular color cube, Fixed Palette uses an explicit set, and Median Cut generates that set from the source before the existing palette quantizer is applied.",
    steps: [
      "Thresholding and stochastic thresholds reduce Processing-style brightness to black or white.",
      "Scalar Floyd-Steinberg and the line variant propagate quantization error through raster order.",
      "RGB Levels and Bayer ordered dithering reduce the original channels using a regular RGB cube.",
      "Fixed palettes use nearest-color mapping and can diffuse a three-component RGB error vector.",
      "Median Cut deterministically generates a palette, then reuses the same palette application algorithms.",
    ],
    formula: "Fixed Palette: p* = argmin_p ((Rc-Rp)^2 + (Gc-Gp)^2 + (Bc-Bp)^2)",
  },
  parameters: [],
  defaultParameters: {
    threshold: 0.5,
    randomAmplitude: 0.5,
    randomSeed: 12345,
    lineLength: 3,
    levelsPerChannel: 4,
    bayerMatrixSize: "4",
    palette: "warm-cool",
    paletteDitheringStrategy: "none",
    customPalette: ["#1b2a41", "#3f8c8e", "#e9a03b", "#d95d39"],
    paletteSize: 8,
  },
  listingImage: {
    id: "dithering-result",
    label: "Dithering result",
    src: "/samples/dithering-result.png",
    alt: "A monochrome dithered still life made from fine diagonal marks.",
  },
  sampleImages: [
    {
      id: "studio-still-life",
      label: "Studio still life",
      src: "/samples/grayscale-still-life.png",
      alt: "A colorful still life with strong edges and a broad brightness range.",
    },
  ],
  methodSelection: {
    label: "Dithering method",
    description: "Methods are grouped by black-and-white and color processing.",
  },
  defaultMethodId: "threshold",
  methods: [
    {
      id: "threshold",
      label: "Threshold",
      group: "Black & White",
      description: "A deterministic binary comparison using source >= threshold.",
      educationalContent: ditheringEducation.threshold,
      parameters: thresholdParameters,
      debugViews: binaryDebugViews,
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: { cpu: thresholdCpuBackend, webgpu: thresholdWebGpuBackend },
    },
    {
      id: "random-threshold",
      label: "Random Threshold",
      group: "Black & White",
      description:
        "Uses a reproducible coordinate-and-seed hash for each pixel threshold.",
      educationalContent: ditheringEducation["random-threshold"],
      parameters: randomThresholdParameters,
      debugViews: [
        originalDebugView,
        sourceIntensityDebugView,
        {
          id: "random-threshold-map",
          label: "Random threshold map",
          description: "The per-pixel threshold sampled for this execution.",
        },
        finalResultDebugView,
      ],
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: {
        cpu: randomThresholdCpuBackend,
        webgpu: randomThresholdWebGpuBackend,
      },
    },
    {
      id: "floyd-steinberg-1d",
      label: "Floyd-Steinberg 1D",
      group: "Black & White",
      description: "Propagates the complete quantization error to the next pixel.",
      educationalContent: ditheringEducation["floyd-steinberg-1d"],
      debugViews: [
        originalDebugView,
        sourceIntensityDebugView,
        ...diffusionDebugViews,
        finalResultDebugView,
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: floydSteinberg1DCpuBackend },
    },
    {
      id: "floyd-steinberg-2d",
      label: "Floyd-Steinberg 2D",
      group: "Black & White",
      description: "Uses the classic 7/16, 3/16, 5/16, 1/16 diffusion stencil.",
      educationalContent: ditheringEducation["floyd-steinberg-2d"],
      debugViews: [
        originalDebugView,
        sourceIntensityDebugView,
        ...diffusionDebugViews,
        finalResultDebugView,
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: floydSteinberg2DCpuBackend },
    },
    {
      id: "floyd-steinberg-lines",
      label: "Floyd-Steinberg 2D with Lines",
      group: "Black & White",
      description:
        "Draws backward diagonal black lines and diffuses the compensated error.",
      educationalContent: ditheringEducation["floyd-steinberg-lines"],
      parameters: lineParameters,
      debugViews: [
        originalDebugView,
        sourceIntensityDebugView,
        ...diffusionDebugViews,
        {
          id: "line-seeds",
          label: "Line seed pixels",
          description: "Pixels whose black decision emitted a diagonal line.",
        },
        {
          id: "line-coverage",
          label: "Line coverage and overlap",
          description: "How many emitted lines wrote each output pixel.",
        },
        finalResultDebugView,
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: floydSteinbergLinesCpuBackend },
    },
    {
      id: "rgb-levels",
      label: "RGB Levels",
      group: "Color",
      description:
        "Quantizes R, G, and B independently to L levels, producing up to L^3 colors.",
      educationalContent: ditheringEducation["rgb-levels"],
      parameters: rgbLevelsParameters,
      debugViews: [
        originalDebugView,
        {
          id: "quantized-result",
          label: "Quantized result",
          description: "The same color-quantized raster shown in the output panel.",
        },
        {
          id: "rgb-level-palette",
          label: "Available RGB color levels",
          description: "Every RGB combination allowed by the selected level count.",
        },
      ],
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: { cpu: rgbLevelsCpuBackend, webgpu: rgbLevelsWebGpuBackend },
    },
    {
      id: "rgb-levels-ordered",
      label: "RGB Levels + Ordered Dithering",
      group: "Color",
      description:
        "Uses a repeating Bayer threshold to choose between adjacent levels in each RGB channel.",
      educationalContent: ditheringEducation["rgb-levels-ordered"],
      parameters: orderedRgbLevelsParameters,
      debugViews: [
        originalDebugView,
        {
          id: "quantized-without-dithering",
          label: "Quantized result without dithering",
          description: "Plain RGB level quantization using the same L value.",
        },
        {
          id: "bayer-threshold-pattern",
          label: "Bayer threshold pattern",
          description: "The ordered threshold tile repeated across the image.",
        },
        {
          ...finalResultDebugView,
          label: "Final ordered-dithered result",
        },
      ],
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: {
        cpu: orderedRgbLevelsCpuBackend,
        webgpu: orderedRgbLevelsWebGpuBackend,
      },
    },
    {
      id: "fixed-palette",
      label: "Fixed Palette Quantization",
      group: "Color",
      description:
        "Maps each RGB pixel to the nearest palette color, optionally diffusing its RGB error with Floyd-Steinberg weights.",
      educationalContent: ditheringEducation["fixed-palette"],
      parameters: fixedPaletteParameters,
      debugViews: [
        originalDebugView,
        {
          id: "palette-swatches",
          label: "Palette swatches",
          description: "The complete set of colors available to the quantizer.",
        },
        {
          id: "quantized-without-diffusion",
          label: "Quantized without diffusion",
          description: "Direct nearest-palette-color mapping for comparison.",
        },
        {
          id: "final-floyd-steinberg-result",
          label: "Final Floyd-Steinberg result",
          description: "The palette result after raster-order RGB error diffusion.",
        },
        {
          id: "color-error-magnitude",
          label: "RGB error magnitude",
          description:
            "Quantization error at each pixel's raster-order decision, normalized for display.",
        },
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: fixedPaletteCpuBackend },
    },
    {
      id: "median-cut",
      label: "Generated Palette - Median Cut",
      group: "Color",
      description:
        "Generates a deterministic source-image palette, then applies nearest-color mapping or the existing RGB Floyd-Steinberg diffusion.",
      educationalContent: ditheringEducation["median-cut"],
      parameters: medianCutParameters,
      debugViews: [
        originalDebugView,
        {
          id: "palette-swatches",
          label: "Generated palette swatches",
          description: "Representative colors averaged from the final Median Cut boxes.",
        },
        {
          id: "quantized-without-diffusion",
          label: "Quantized without diffusion",
          description: "Nearest-color mapping with the generated palette.",
        },
        {
          id: "final-floyd-steinberg-result",
          label: "Final Floyd-Steinberg result",
          description: "Optional RGB error diffusion using the generated palette.",
        },
        {
          id: "color-error-magnitude",
          label: "RGB error magnitude",
          description: "Quantization error at each palette decision.",
        },
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: medianCutCpuBackend },
    },
  ],
};
