import {
  degreesToRadians,
  normalizeCellDimension,
} from "../../coordinates";
import type {
  CmykAnglePreset,
  ScreeningParameters,
} from "../../types";
import type { CmykAngles, CmykScreeningOptions } from "./types";

type FixedCmykAnglePreset = Exclude<CmykAnglePreset, "custom">;

export const cmykAnglePresets: Record<FixedCmykAnglePreset, CmykAngles> = {
  "classic-cmyk": { cyan: 15, magenta: 75, yellow: 0, black: 45 },
  aligned: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
  "moire-demo": { cyan: 15, magenta: 18, yellow: 0, black: 45 },
};

export function resolveCmykAngles(parameters: ScreeningParameters): CmykAngles {
  if (parameters.cmykAnglePreset !== "custom") {
    return { ...cmykAnglePresets[parameters.cmykAnglePreset] };
  }

  const angles = {
    cyan: parameters.cmykCyanAngleDegrees,
    magenta: parameters.cmykMagentaAngleDegrees,
    yellow: parameters.cmykYellowAngleDegrees,
    black: parameters.cmykBlackAngleDegrees,
  };
  if (Object.values(angles).some((value) => !Number.isFinite(value))) {
    throw new Error("CMYK screen angles must be finite numbers.");
  }
  return angles;
}

export function createCmykScreeningOptions(
  parameters: ScreeningParameters,
): CmykScreeningOptions {
  const angles = resolveCmykAngles(parameters);
  return {
    cellSize: normalizeCellDimension(
      parameters.cmykCellSize,
      "Screen cell size",
    ),
    angleRadians: {
      cyan: degreesToRadians(angles.cyan),
      magenta: degreesToRadians(angles.magenta),
      yellow: degreesToRadians(angles.yellow),
      black: degreesToRadians(angles.black),
    },
  };
}
