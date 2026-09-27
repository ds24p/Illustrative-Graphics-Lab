import type { ExperimentParameters } from "../../core/parameters/types";

export interface PainterlyParameters extends ExperimentParameters {
  brushRadius: number;
  minStrokeLength: number;
  maxStrokeLength: number;
  stepFactor: number;
  errorThreshold: number;
  gridFactor: number;
  blurFactor: number;
  directionSmoothing: number;
  seed: number;
  background: string;
}

export interface Point { x: number; y: number }
export interface RgbColor { r: number; g: number; b: number }

// Opaque, interleaved RGB in [0, 255], retaining fractional blur values.
export interface RgbImage {
  width: number;
  height: number;
  data: Float32Array;
}

export interface GradientField {
  width: number;
  height: number;
  gx: Float32Array;
  gy: Float32Array;
  magnitude: Float32Array;
}

// Independent of Canvas2D and of future solid/textured rendering choices.
export interface PainterlyStroke {
  points: Point[];
  color: RgbColor;
  radius: number;
  opacity: number;
}
