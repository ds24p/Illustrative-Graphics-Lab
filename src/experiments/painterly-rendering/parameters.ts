import type { ParameterDefinition } from "../../core/parameters/types";
import type { PainterlyParameters } from "./types";

export const painterlyDefaults: PainterlyParameters = {
  brushRadius: 8,
  minStrokeLength: 4,
  maxStrokeLength: 16,
  stepFactor: 1,
  errorThreshold: 2500,
  gridFactor: 1,
  blurFactor: 0.5,
  directionSmoothing: 0.5,
  seed: 12345,
  background: "#ffffff",
};

export const painterlyParameters: ParameterDefinition[] = [
  { key: "brushRadius", kind: "range", label: "Brush radius", defaultValue: 8, min: 1, max: 32, step: 1,
    description: "Radius in image pixels. The painted width is twice this value." },
  { key: "minStrokeLength", kind: "integer", label: "Minimum stroke length", defaultValue: 4, min: 1, max: 50,
    description: "Segments before color-based stopping is allowed. Image boundaries can stop a stroke sooner." },
  { key: "maxStrokeLength", kind: "integer", label: "Maximum stroke length", defaultValue: 16, min: 2, max: 100,
    description: "Maximum number of segments, each up to Stroke step long. Must be at least the minimum." },
  { key: "stepFactor", kind: "number", label: "Stroke step (× radius)", defaultValue: 1, min: 0.25, max: 2, step: 0.25,
    description: "Step in pixels = this factor × brush radius; defaults to 8 px." },
  { key: "errorThreshold", kind: "integer", label: "Error threshold", defaultValue: 2500, min: 0, max: 195075, step: 100,
    description: "Mean squared RGB distance per cell, using channels 0–255. Scale: 0–195075; lower values place more strokes." },
  { key: "gridFactor", kind: "number", label: "Grid spacing (× radius)", defaultValue: 1, min: 0.5, max: 4, step: 0.25,
    description: "Cell side = round(factor × radius), at least 1 px; defaults to 8 px." },
  { key: "blurFactor", kind: "range", label: "Blur factor (σ / radius)", defaultValue: 0.5, min: 0, max: 1, step: 0.05,
    description: "Gaussian sigma = factor × radius; defaults to 4 px. Zero disables blur." },
  { key: "directionSmoothing", kind: "range", label: "Direction smoothing", defaultValue: 0.5, min: 0, max: 1, step: 0.05,
    description: "0 follows each local contour direction; 1 keeps the initial direction for straight strokes." },
  { key: "seed", kind: "integer", label: "Seed", defaultValue: 12345, min: 0, max: 4294967295,
    description: "Reproduces flat-region directions and the shuffled drawing order." },
  { key: "background", kind: "select", label: "Canvas background", defaultValue: "#ffffff",
    options: [{ value: "#ffffff", label: "White" }], description: "Phase 1A starts with a white painting canvas." },
];

export function resolvePainterlyParameters(parameters: PainterlyParameters) {
  for (const definition of painterlyParameters) {
    if (!("min" in definition) || !("max" in definition)) continue;
    const value = parameters[definition.key];
    if (typeof value !== "number" || !Number.isFinite(value) ||
      value < definition.min! || value > definition.max! ||
      (definition.kind === "integer" && !Number.isInteger(value))) {
      throw new Error(`${definition.label} must be ${definition.kind === "integer" ? "an integer" : "a number"} from ${definition.min} to ${definition.max}.`);
    }
  }
  if (parameters.minStrokeLength > parameters.maxStrokeLength) {
    throw new Error("Minimum stroke length must not exceed Maximum stroke length (both count segments).");
  }
  if (parameters.background !== "#ffffff") throw new Error("Phase 1A requires a white canvas background.");
  return {
    ...parameters,
    step: parameters.brushRadius * parameters.stepFactor,
    gridSpacing: Math.max(1, Math.round(parameters.brushRadius * parameters.gridFactor)),
    sigma: parameters.brushRadius * parameters.blurFactor,
  };
}
