import type { ExperimentDefinition } from "../../core/experiments/types";
import { createGrayscaleCpuBackend } from "./backend.cpu";
import type { GrayscaleParameters } from "./types";

export const grayscaleExperiment: ExperimentDefinition<GrayscaleParameters> = {
  metadata: {
    id: "grayscale",
    title: "Grayscale Conversion",
    summary:
      "Compare standard ways of reducing RGB color to a single intensity value.",
    category: "Image processing",
    tags: ["raster", "color", "foundation"],
  },
  description: {
    overview:
      "Grayscale conversion maps every RGB pixel to an achromatic intensity. The selected method controls how strongly each source channel contributes.",
    steps: [
      "Read the red, green, and blue values for each pixel.",
      "Compute a gray intensity using the selected method.",
      "Blend that intensity with the original color, then preserve or replace alpha.",
    ],
    formula: "Y = 0.2126R + 0.7152G + 0.0722B",
  },
  parameters: [
    {
      key: "intensity",
      kind: "range",
      label: "Effect intensity",
      description: "Blend between the source color and full grayscale.",
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.05,
      format: "percent",
    },
    {
      key: "preserveAlpha",
      kind: "boolean",
      label: "Preserve transparency",
      description: "Keep each source pixel's alpha value.",
      defaultValue: true,
    },
  ],
  defaultParameters: {
    intensity: 1,
    preserveAlpha: true,
  },
  listingImage: {
    id: "grayscale-result",
    label: "Grayscale result",
    src: "/samples/grayscale-result.png",
    alt: "A grayscale still life with a flower, vase, cube, fabric, and drawing.",
  },
  sampleImages: [
    {
      id: "studio-still-life",
      label: "Studio still life",
      src: "/samples/grayscale-still-life.png",
      alt: "A colorful still life with a blue vase, yellow flower, red cube, teal fabric, and charcoal drawing.",
    },
  ],
  methodSelection: {
    label: "Conversion method",
    description: "Choose how RGB channels contribute to gray intensity.",
  },
  defaultMethodId: "luminance",
  methods: [
    {
      id: "luminance",
      label: "Luminance (Rec. 709)",
      description: "Weights channels according to human brightness sensitivity.",
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: createGrayscaleCpuBackend("luminance") },
    },
    {
      id: "average",
      label: "RGB average",
      description: "Gives red, green, and blue equal influence.",
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: createGrayscaleCpuBackend("average") },
    },
    {
      id: "desaturation",
      label: "Desaturation",
      description: "Averages the brightest and darkest source channels.",
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: createGrayscaleCpuBackend("desaturation") },
    },
  ],
  debugViews: [
    {
      id: "tonal-bands",
      label: "Tonal bands",
      description: "Group the output luminance into five false-color bands.",
    },
  ],
};
