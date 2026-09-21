import type { ExperimentParameters } from "../../core/parameters/types";

export type TemplateColorMode = "black-white" | "color";

// Include every shared and method-specific value in one plain object.
export type TemplateParameters = ExperimentParameters & {
  colorMode: TemplateColorMode;
  intensity: number;
  gamma: number;
  preserveAlpha: boolean;
  inkColor: string;
  threshold: number;
  invert: boolean;
  levels: number;
  channelBias: number;
};
