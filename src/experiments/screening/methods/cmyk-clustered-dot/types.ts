import type { ImageCenterRotation } from "../../coordinates";

export type CmykChannel = "cyan" | "magenta" | "yellow" | "black";

export interface CmykColor {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
}

export interface NormalizedRgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface CmykAngles {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
}

export interface CmykScreeningOptions {
  cellSize: number;
  angleRadians: CmykAngles;
}

export interface ClusteredDotThresholdCell {
  size: number;
  values: Float32Array;
}

export interface CmykScreenSamplers {
  cyan: ImageCenterRotation;
  magenta: ImageCenterRotation;
  yellow: ImageCenterRotation;
  black: ImageCenterRotation;
}

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface CmykDebugData {
  coverages: Record<CmykChannel, Float32Array>;
  thresholds: Record<CmykChannel, Float32Array>;
  masks: Record<CmykChannel, Uint8Array>;
}

export interface CmykScreeningResult {
  image: RgbaImage;
  debug?: CmykDebugData;
}
