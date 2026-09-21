import type { ExperimentParameters } from "../../core/parameters/types";

export type DitheringParameters = ExperimentParameters & {
  threshold: number;
  randomAmplitude: number;
  randomSeed: number;
  lineLength: number;
  levelsPerChannel: number;
  bayerMatrixSize: string;
  palette: string;
  paletteDitheringStrategy: string;
  customPalette: string[];
  paletteSize: number;
};

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface IntensityImage {
  width: number;
  height: number;
  values: Float32Array;
}

export interface BinaryImage {
  width: number;
  height: number;
  values: Uint8Array;
}

export interface DiffusionDebugData {
  adjustedIntensity?: Float32Array;
  incomingError?: Float32Array;
  lineSeeds?: Uint8Array;
  lineCoverage?: Uint16Array;
}

export interface DitheringCoreResult {
  image: BinaryImage;
  debug?: DiffusionDebugData;
}

export interface BackwardLine {
  x: number;
  y: number;
  length: number;
}
