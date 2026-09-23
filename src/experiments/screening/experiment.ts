import type { ExperimentDefinition } from "../../core/experiments/types";
import {
  cmykClusteredDotEducation,
  crossEducation,
  doubleSidedRampEducation,
  imageKernelEducation,
  textScreeningEducation,
} from "./education";
import { cmykClusteredDotCpuBackend } from "./methods/cmyk-clustered-dot/backend.cpu";
import { cmykClusteredDotWebGpuBackend } from "./methods/cmyk-clustered-dot/backend.webgpu";
import { imageKernelCpuBackend } from "./methods/image-kernel/backend.cpu";
import { imageKernelWebGpuBackend } from "./methods/image-kernel/backend.webgpu";
import {
  crossCpuBackend,
  doubleSidedRampCpuBackend,
} from "./methods/procedural/backend.cpu";
import {
  crossWebGpuBackend,
  doubleSidedRampWebGpuBackend,
} from "./methods/procedural/backend.webgpu";
import { textScreeningCpuBackend } from "./methods/text/backend.cpu";
import {
  cmykClusteredDotParameters,
  crossParameters,
  deriveProceduralCellDimensions,
  doubleSidedRampParameters,
  imageKernelParameters,
  textScreeningParameters,
} from "./parameters";
import type { ScreeningParameters } from "./types";

const proceduralDebugViews = [
  {
    id: "original",
    label: "Original",
    description: "The immutable uploaded or sample source image.",
  },
  {
    id: "processing-brightness",
    label: "Processing brightness",
    description: "Source intensity computed as max(R, G, B) / 255.",
  },
  {
    id: "raw-procedural-kernel",
    label: "Raw Procedural Kernel",
    description: "The mathematical function sampled directly over (s, t).",
  },
  {
    id: "modulo-mapped-kernel",
    label: "Modulo-Mapped Kernel",
    description: "The axis-aligned kernel repeated over image coordinates.",
  },
  {
    id: "threshold-before-sine",
    label: "Threshold Before Sine",
    description:
      "The rotated threshold field before displacement, generated only when sine is enabled.",
  },
  {
    id: "final-threshold-field",
    label: "Final Threshold Field",
    description: "The actual threshold after rotation and optional displacement.",
  },
  {
    id: "final-result",
    label: "Final Result",
    description: "The same binary raster shown in the output panel.",
  },
];

const textDebugViews = [
  {
    id: "original",
    label: "Original",
    description: "The immutable uploaded or sample source image.",
  },
  {
    id: "processing-brightness",
    label: "Processing Brightness",
    description: "Source intensity computed as max(R, G, B) / 255.",
  },
  {
    id: "block-average-intensity",
    label: "Block Average Intensity",
    description: "Each scaled text cell filled with its valid-pixel mean intensity.",
  },
  {
    id: "intensity-level-map",
    label: "Intensity Level Map",
    description: "The selected integer level 0-7, normalized for display.",
  },
  {
    id: "selected-glyph-map",
    label: "Selected Characters / Glyph Map",
    description: "The seeded A-Z glyph selected for every source cell.",
  },
  {
    id: "final-result",
    label: "Final Result",
    description: "The same grayscale glyph raster shown in the output panel.",
  },
];

const cmykDebugViews = [
  {
    id: "original",
    label: "Original",
    description: "The immutable uploaded or sample source image.",
    group: "Source",
  },
  ...(["Cyan", "Magenta", "Yellow", "Black"] as const).map((channel) => ({
    id: `${channel.toLowerCase()}-coverage`,
    label: `${channel} Coverage`,
    description: `${channel} ink coverage, where white means no ink and the full ink color means maximum coverage.`,
    group: "Continuous CMYK separations",
  })),
  ...(["Cyan", "Magenta", "Yellow", "Black"] as const).map((channel) => ({
    id: `${channel.toLowerCase()}-threshold`,
    label: `${channel} Threshold`,
    description: `The rotated periodic threshold field used by the ${channel.toLowerCase()} plate.`,
    group: "Screen threshold fields",
  })),
  ...(["Cyan", "Magenta", "Yellow", "Black"] as const).map((channel) => ({
    id: `${channel.toLowerCase()}-ink-mask`,
    label: `${channel} Ink Mask`,
    description: `The binary ${channel.toLowerCase()} plate shown in its ideal ink color on white.`,
    group: "Binary ink masks",
  })),
  {
    id: "final-result",
    label: "Idealized subtractive preview",
    description: "The same idealized CMYK composite shown in the output panel.",
    group: "Composite",
  },
];

export const screeningExperiment: ExperimentDefinition<ScreeningParameters> = {
  metadata: {
    id: "screening",
    title: "Screening",
    summary:
      "Explore black-and-white threshold fields, text screening, and four-channel CMYK clustered dots.",
    category: "Illustrative image processing",
    tags: [
      "raster",
      "screening",
      "threshold field",
      "kernel tiling",
      "procedural",
      "text glyphs",
      "CMYK",
      "clustered dots",
    ],
  },
  description: {
    overview:
      "Screening can compare brightness with a spatial threshold, reduce cells to glyphs, or independently screen continuous CMYK ink coverages.",
    steps: [
      "Convert the source to Processing-style brightness.",
      "Apply the selected method's brightness, cell-reduction, or ink-coverage pipeline.",
      "Inspect the final raster and method-specific intermediate views.",
    ],
  },
  parameters: [],
  defaultParameters: {
    kernelSource: "built-in",
    builtInKernel: "kernel-3",
    customKernel: null,
    kernelWidth: 16,
    kernelHeight: 16,
    screenAngleDegrees: 0,
    cellWidth: 16,
    cellHeight: 16,
    sineDisplacement: true,
    sineAmplitude: 1,
    sineFrequency: 1,
    sinePhaseDegrees: 0,
    crossI: 0.5,
    textSeed: 12345,
    textScale: 1,
    cmykCellSize: 12,
    cmykAnglePreset: "classic-cmyk",
    cmykCyanAngleDegrees: 15,
    cmykMagentaAngleDegrees: 75,
    cmykYellowAngleDegrees: 0,
    cmykBlackAngleDegrees: 45,
  },
  sourceParameterDefaults: (source) =>
    deriveProceduralCellDimensions(
      source.imageData.width,
      source.imageData.height,
    ),
  sampleImages: [
    {
      id: "studio-still-life",
      label: "Studio still life",
      src: "/samples/grayscale-still-life.png",
      alt: "A colorful still life with a broad Processing-brightness range.",
    },
  ],
  methodSelection: {
    label: "Screening method",
    description: "Choose a threshold-field or glyph-based screening method.",
  },
  defaultMethodId: "image-kernel",
  methods: [
    {
      id: "image-kernel",
      label: "Image-Kernel Screening",
      description:
        "Repeats a grayscale image as an inverted local threshold field.",
      educationalContent: imageKernelEducation,
      parameters: imageKernelParameters,
      debugViews: [
        {
          id: "original",
          label: "Original",
          description: "The immutable uploaded or sample source image.",
        },
        {
          id: "processing-brightness",
          label: "Processing brightness",
          description: "Source intensity computed as max(R, G, B) / 255.",
        },
        {
          id: "normalized-kernel",
          label: "Normalized kernel",
          description: "The resized numeric kernel actually used by the algorithm.",
        },
        {
          id: "tiled-kernel",
          label: "Tiled kernel",
          description: "K(x mod kw, y mod kh) over the full source dimensions.",
        },
        {
          id: "threshold-field",
          label: "Threshold field",
          description: "The inverted periodic field: 1 - K(x mod kw, y mod kh).",
        },
        {
          id: "final-result",
          label: "Final result",
          description: "The same binary raster shown in the output panel.",
        },
      ],
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: {
        cpu: imageKernelCpuBackend,
        webgpu: imageKernelWebGpuBackend,
      },
    },
    {
      id: "procedural-double-sided-ramp",
      label: "Procedural - Double-Sided Ramp",
      description:
        "Repeats a one-dimensional triangular ramp with rotation and optional sine displacement.",
      educationalContent: doubleSidedRampEducation,
      parameters: doubleSidedRampParameters,
      debugViews: proceduralDebugViews,
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: {
        cpu: doubleSidedRampCpuBackend,
        webgpu: doubleSidedRampWebGpuBackend,
      },
    },
    {
      id: "procedural-cross",
      label: "Procedural - Cross",
      description:
        "Uses the original two-branch Cross equation as a repeating threshold field.",
      educationalContent: crossEducation,
      parameters: crossParameters,
      debugViews: proceduralDebugViews,
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: {
        cpu: crossCpuBackend,
        webgpu: crossWebGpuBackend,
      },
    },
    {
      id: "text-screening",
      label: "Text Screening",
      description:
        "Reduces scaled cells to average intensity and replaces them with seeded A-Z glyph rasters.",
      educationalContent: textScreeningEducation,
      parameters: textScreeningParameters,
      debugViews: textDebugViews,
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: textScreeningCpuBackend },
    },
    {
      id: "cmyk-clustered-dot",
      label: "CMYK Clustered-Dot Screening",
      group: "Color screening",
      description:
        "Screens four continuous CMYK ink coverages with independently rotated clustered-dot cells.",
      educationalContent: cmykClusteredDotEducation,
      parameters: cmykClusteredDotParameters,
      debugViews: cmykDebugViews,
      supportedBackends: ["cpu", "webgpu"],
      defaultBackend: "cpu",
      backends: {
        cpu: cmykClusteredDotCpuBackend,
        webgpu: cmykClusteredDotWebGpuBackend,
      },
    },
  ],
};
