import type { ParameterDefinition } from "../../core/parameters/types";
import { MAX_KERNEL_DIMENSION } from "./kernelNormalization";
import { builtInKernels } from "./kernels/catalog";
import { resolveBuiltInKernelPreview } from "./kernels/preview";
import { getTextCellDimensions } from "./methods/text/scale";

export const imageKernelParameters: ParameterDefinition[] = [
  {
    key: "kernelSource",
    kind: "select",
    label: "Kernel source",
    description: "Use a course preset or upload your own grayscale pattern.",
    defaultValue: "built-in",
    options: [
      { value: "built-in", label: "Built-in" },
      { value: "custom", label: "Custom upload" },
    ],
  },
  {
    key: "builtInKernel",
    kind: "image-select",
    label: "Kernel",
    description: "Preview shows the normalized pattern at the selected width and height.",
    defaultValue: "kernel-3",
    resolvePreview: resolveBuiltInKernelPreview,
    options: builtInKernels.map((kernel) => ({
      value: kernel.id,
      label: kernel.label,
      previewSrc: kernel.src,
      alt: `${kernel.label} threshold pattern`,
    })),
    visibleWhen: { parameter: "kernelSource", equals: "built-in" },
  },
  {
    key: "customKernel",
    kind: "image",
    label: "Custom kernel",
    description:
      "PNG, JPEG, or WebP up to 10 MB and 4096 px per edge. Transparency is composited over white.",
    defaultValue: null,
    accept: "image/png,image/jpeg,image/webp",
    acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    maxFileBytes: 10 * 1024 * 1024,
    maxSourceEdge: 4096,
    maxSourcePixels: 16_000_000,
    visibleWhen: { parameter: "kernelSource", equals: "custom" },
  },
  {
    key: "kernelWidth",
    kind: "integer",
    label: "Kernel width",
    description: "Width of the normalized repeating kernel in pixels.",
    defaultValue: 16,
    min: 1,
    max: MAX_KERNEL_DIMENSION,
  },
  {
    key: "kernelHeight",
    kind: "integer",
    label: "Kernel height",
    description: "Height of the normalized repeating kernel in pixels.",
    defaultValue: 16,
    min: 1,
    max: MAX_KERNEL_DIMENSION,
  },
];

const sineParameters: ParameterDefinition[] = [
  {
    key: "sineDisplacement",
    kind: "boolean",
    label: "Sine displacement",
    description: "Displace the normalized s coordinate with a sine wave.",
    defaultValue: true,
  },
  {
    key: "sineAmplitude",
    kind: "number",
    label: "Amplitude",
    description:
      "Displacement measured in normalized cell widths. The Processing default is 1.",
    defaultValue: 1,
    step: 0.05,
    visibleWhen: { parameter: "sineDisplacement", equals: true },
  },
  {
    key: "sineFrequency",
    kind: "number",
    label: "Frequency",
    description: "Number of sine cycles over the normalized t coordinate.",
    defaultValue: 1,
    step: 0.5,
    visibleWhen: { parameter: "sineDisplacement", equals: true },
  },
  {
    key: "sinePhaseDegrees",
    kind: "number",
    label: "Phase",
    description: "Wave phase in degrees; it is converted to radians internally.",
    defaultValue: 0,
    step: 15,
    visibleWhen: { parameter: "sineDisplacement", equals: true },
  },
];

const sharedProceduralParameters: ParameterDefinition[] = [
  {
    key: "screenAngleDegrees",
    kind: "number",
    label: "Screen angle",
    description:
      "Coordinate rotation in degrees around the actual image center.",
    defaultValue: 0,
    step: 1,
  },
  {
    key: "cellWidth",
    kind: "integer",
    label: "Cell width",
    description:
      "Repeating-cell width in pixels. The source-dependent default is floor(image width / 16), at least 1.",
    defaultValue: 16,
    min: 1,
  },
  {
    key: "cellHeight",
    kind: "integer",
    label: "Cell height",
    description:
      "Repeating-cell height in pixels. The source-dependent default is floor(image height / 16), at least 1.",
    defaultValue: 16,
    min: 1,
  },
  ...sineParameters,
];

export const doubleSidedRampParameters: ParameterDefinition[] = [
  ...sharedProceduralParameters,
];

export const crossParameters: ParameterDefinition[] = [
  {
    key: "crossI",
    kind: "range",
    label: "I",
    description:
      "Branch boundary and coefficient from the original Cross equation.",
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  ...sharedProceduralParameters,
];

export const textScreeningParameters: ParameterDefinition[] = [
  {
    key: "textScale",
    kind: "range",
    label: "Text Scale",
    description: "Scales both the source cell and its atlas glyph.",
    defaultValue: 1,
    min: 0.5,
    max: 4,
    step: 0.25,
    formatValue: (value) => {
      const { width, height } = getTextCellDimensions(value);
      return `${value.toFixed(2).replace(/0$/, "")}x (${width} x ${height} px)`;
    },
  },
  {
    key: "textSeed",
    kind: "integer",
    label: "Seed",
    description:
      "Deterministically chooses an A-Z character within each intensity level.",
    defaultValue: 12345,
    min: 0,
    max: 4_294_967_295,
    step: 1,
  },
];

const customAngleVisibility = {
  parameter: "cmykAnglePreset",
  equals: "custom",
} as const;

export const cmykClusteredDotParameters: ParameterDefinition[] = [
  {
    key: "cmykCellSize",
    kind: "integer",
    label: "Screen cell size",
    description:
      "Shared square cell size in pixels. Larger cells make a coarser screen with larger dots; smaller cells make a finer screen.",
    defaultValue: 12,
    min: 2,
    max: 64,
  },
  {
    key: "cmykAnglePreset",
    kind: "select",
    label: "Angle preset",
    description:
      "Classic forms a regular CMYK rosette; the Moir\u00e9 Demo places cyan and magenta close enough to reveal interference.",
    defaultValue: "classic-cmyk",
    options: [
      { value: "classic-cmyk", label: "Classic CMYK" },
      { value: "aligned", label: "Aligned" },
      { value: "moire-demo", label: "Moir\u00e9 Demo" },
      { value: "custom", label: "Custom" },
    ],
  },
  {
    key: "cmykCyanAngleDegrees",
    kind: "number",
    label: "C angle",
    description: "Cyan screen angle in degrees.",
    defaultValue: 15,
    min: -360,
    max: 360,
    step: 1,
    visibleWhen: customAngleVisibility,
  },
  {
    key: "cmykMagentaAngleDegrees",
    kind: "number",
    label: "M angle",
    description: "Magenta screen angle in degrees.",
    defaultValue: 75,
    min: -360,
    max: 360,
    step: 1,
    visibleWhen: customAngleVisibility,
  },
  {
    key: "cmykYellowAngleDegrees",
    kind: "number",
    label: "Y angle",
    description: "Yellow screen angle in degrees.",
    defaultValue: 0,
    min: -360,
    max: 360,
    step: 1,
    visibleWhen: customAngleVisibility,
  },
  {
    key: "cmykBlackAngleDegrees",
    kind: "number",
    label: "K angle",
    description: "Black screen angle in degrees.",
    defaultValue: 45,
    min: -360,
    max: 360,
    step: 1,
    visibleWhen: customAngleVisibility,
  },
];

export function deriveProceduralCellDimensions(width: number, height: number) {
  return {
    cellWidth: Math.max(1, Math.floor(width / 16)),
    cellHeight: Math.max(1, Math.floor(height / 16)),
  };
}
