import type { ExperimentParameters } from "../../core/parameters/types";

export type GrayscaleMethod = "luminance" | "average" | "desaturation";

export type GrayscaleParameters = ExperimentParameters & {
  intensity: number;
  preserveAlpha: boolean;
};
