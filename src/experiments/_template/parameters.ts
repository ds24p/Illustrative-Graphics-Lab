import type { ParameterDefinition } from "../../core/parameters/types";

export const sharedParameters: ParameterDefinition[] = [
  {
    key: "colorMode",
    kind: "select",
    label: "Color mode",
    defaultValue: "black-white",
    options: [
      { value: "black-white", label: "Black & white" },
      { value: "color", label: "Color" },
    ],
  },
  {
    key: "intensity",
    kind: "range",
    label: "Effect intensity",
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.05,
    format: "percent",
  },
  {
    key: "gamma",
    kind: "number",
    label: "Gamma",
    description: "Values below 1 brighten midtones; values above 1 darken them.",
    defaultValue: 1,
    min: 0.1,
    max: 3,
    step: 0.1,
  },
  {
    key: "preserveAlpha",
    kind: "boolean",
    label: "Preserve transparency",
    defaultValue: true,
  },
  {
    key: "inkColor",
    kind: "color",
    label: "Ink color",
    defaultValue: "#111111",
    visibleWhen: { parameter: "colorMode", equals: "black-white" },
  },
];

export const thresholdParameters: ParameterDefinition[] = [
  {
    key: "threshold",
    kind: "integer",
    label: "Threshold",
    defaultValue: 128,
    min: 0,
    max: 255,
  },
  {
    key: "invert",
    kind: "boolean",
    label: "Invert result",
    defaultValue: false,
  },
];

export const posterizeParameters: ParameterDefinition[] = [
  {
    key: "levels",
    kind: "integer",
    label: "Levels per channel",
    defaultValue: 4,
    min: 2,
    max: 16,
  },
  {
    key: "channelBias",
    kind: "range",
    label: "Color bias",
    defaultValue: 0,
    min: -1,
    max: 1,
    step: 0.1,
    visibleWhen: { parameter: "colorMode", equals: "color" },
  },
];
