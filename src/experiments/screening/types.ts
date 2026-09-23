import type { ImageSource } from "../../core/images/types";
import type { ExperimentParameters } from "../../core/parameters/types";

export type KernelSourceKind = "built-in" | "custom";
export type CmykAnglePreset =
  | "classic-cmyk"
  | "aligned"
  | "moire-demo"
  | "custom";

export interface ScreeningParameters extends ExperimentParameters {
  kernelSource: KernelSourceKind;
  builtInKernel: string;
  customKernel: ImageSource | null;
  kernelWidth: number;
  kernelHeight: number;
  screenAngleDegrees: number;
  cellWidth: number;
  cellHeight: number;
  sineDisplacement: boolean;
  sineAmplitude: number;
  sineFrequency: number;
  sinePhaseDegrees: number;
  crossI: number;
  textSeed: number;
  textScale: number;
  cmykCellSize: number;
  cmykAnglePreset: CmykAnglePreset;
  cmykCyanAngleDegrees: number;
  cmykMagentaAngleDegrees: number;
  cmykYellowAngleDegrees: number;
  cmykBlackAngleDegrees: number;
}

export interface IntensityImage {
  width: number;
  height: number;
  values: Float32Array;
}

export interface ScreeningKernel {
  width: number;
  height: number;
  values: Float32Array;
}

export interface BinaryImage {
  width: number;
  height: number;
  values: Uint8Array;
}

export interface ImageKernelDebugData {
  tiledKernel: Float32Array;
  thresholdField: Float32Array;
}

export interface ImageKernelScreeningResult {
  image: BinaryImage;
  debug?: ImageKernelDebugData;
}

export interface NormalizedPoint {
  s: number;
  t: number;
}

export interface ImagePoint {
  x: number;
  y: number;
}

export interface ProceduralKernelParameters {
  I: number;
}

export type ProceduralKernel = (
  s: number,
  t: number,
  parameters: ProceduralKernelParameters,
) => number;

export interface SineDisplacementOptions {
  enabled: boolean;
  amplitude: number;
  frequency: number;
  phaseRadians: number;
}

export interface ProceduralScreeningOptions {
  angleRadians: number;
  cellWidth: number;
  cellHeight: number;
  sine: SineDisplacementOptions;
  kernelParameters: ProceduralKernelParameters;
}

export interface ScalarField {
  width: number;
  height: number;
  values: Float32Array;
}

export interface ProceduralDebugData {
  rawKernel: ScalarField;
  moduloMappedKernel: Float32Array;
  thresholdBeforeSine?: Float32Array;
  thresholdField: Float32Array;
}

export interface ProceduralScreeningResult {
  image: BinaryImage;
  debug?: ProceduralDebugData;
}
