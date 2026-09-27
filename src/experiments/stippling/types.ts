import type { ExperimentParameters } from "../../core/parameters/types";

export interface StipplingParameters extends ExperimentParameters {
  seed: number;
  targetPoints: number;
  maxAttempts: number;
  intensityWindow: number;
  dotSize: number;
  poissonRadius: number;
  spacingMode: "adaptive" | "uniform";
  spacingCheck: "exact" | "historical-occupancy";
  initialPoints: number;
  iterations: number;
  lloydMode: "unweighted" | "weighted" | "historical-cone";
  removeNearWhite: boolean;
}

export interface IntensityImage {
  width: number;
  height: number;
  values: Float32Array;
}

export interface PlacementPoint {
  x: number;
  y: number;
}

export interface PlacementResult {
  points: PlacementPoint[];
  attempts: number;
  targetReached: boolean;
  acceptanceRate: number;
}

export interface PoissonPoint extends PlacementPoint {
  exclusionRadius: number;
}

export interface PoissonResult {
  points: PoissonPoint[];
  attempts: number;
  targetReached: boolean;
  acceptanceRate: number;
}

export interface HistoricalPoissonResult extends PoissonResult {
  occupancy: Uint8Array;
}
