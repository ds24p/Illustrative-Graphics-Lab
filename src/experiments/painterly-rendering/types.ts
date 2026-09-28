import type { ExperimentParameters } from "../../core/parameters/types";
import type { ImageSource } from "../../core/images/types";

export interface PainterlyParameters extends ExperimentParameters {
  brushSizes: string;
  distanceMode: "radius" | "pixels";
  minStrokeLength: number;
  maxStrokeLength: number;
  stepFactor: number;
  stepPixels: number;
  errorThreshold: number;
  gridFactor: number;
  gridPixels: number;
  blurFactor: number;
  directionFollowing: number;
  strokeOpacity: number;
  colorJitter: number;
  strokeRendering: "solid" | "textured";
  brushType: "soft" | "flat" | "bristle" | "dry" | "rough" | "custom";
  textureSpacing: number;
  textureScale: number;
  rotationOffset: number;
  customBrush: ImageSource | null;
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

// Initialized once on white. drawLayer must preserve previously painted pixels.
export interface PaintingSurface {
  drawLayer(strokes: PainterlyStroke[]): void;
  snapshot(): ImageData;
}

export type PaintingSurfaceFactory = (width: number, height: number) => PaintingSurface;
