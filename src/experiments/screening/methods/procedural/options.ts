import type {
  ProceduralScreeningOptions,
  ScreeningParameters,
} from "../../types";
import {
  degreesToRadians,
  normalizeCellDimension,
} from "./coordinates";

export function createProceduralOptions(
  parameters: ScreeningParameters,
): ProceduralScreeningOptions {
  return {
    angleRadians: degreesToRadians(parameters.screenAngleDegrees),
    cellWidth: normalizeCellDimension(parameters.cellWidth, "Cell width"),
    cellHeight: normalizeCellDimension(parameters.cellHeight, "Cell height"),
    sine: {
      enabled: parameters.sineDisplacement,
      amplitude: parameters.sineAmplitude,
      frequency: parameters.sineFrequency,
      phaseRadians: degreesToRadians(parameters.sinePhaseDegrees),
    },
    kernelParameters: { I: parameters.crossI },
  };
}
