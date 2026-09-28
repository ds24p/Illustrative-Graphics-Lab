import type { NumberListParameterDefinition, ParameterDefinition } from "../../core/parameters/types";
import { normalizeNumberList } from "../../core/parameters/numberList";
import { getBrushMask, type BrushTextureConfig, type BrushType } from "./brushes";
import type { PainterlyParameters } from "./types";

export const painterlyDefaults: PainterlyParameters = {
  brushSizes: "16, 8, 4",
  distanceMode: "radius",
  minStrokeLength: 4,
  maxStrokeLength: 16,
  stepFactor: 1,
  stepPixels: 8,
  errorThreshold: 2500,
  gridFactor: 1,
  gridPixels: 8,
  blurFactor: 0.5,
  directionFollowing: 0.5,
  strokeOpacity: 1,
  colorJitter: 0,
  strokeRendering: "solid",
  brushType: "soft",
  textureSpacing: 0.3,
  textureScale: 1,
  rotationOffset: 0,
  customBrush: null,
  seed: 12345,
  background: "#ffffff",
};

export const brushSizesParameter: NumberListParameterDefinition = {
  key: "brushSizes", kind: "number-list", label: "Brush Sizes", defaultValue: "16, 8, 4",
  min: 1, max: 64, maxItems: 8, unit: "px",
  description: "Brush radii in pixels, separated by commas. Duplicates are removed; largest paints first. One radius also works.",
};

export const painterlyParameters: ParameterDefinition[] = [
  { ...brushSizesParameter, group: "Brush scales" },
  { key: "distanceMode", kind: "select", label: "Step and grid units", group: "Brush scales", defaultValue: "radius",
    options: [{ value: "radius", label: "Scale with brush radius" }, { value: "pixels", label: "Fixed image pixels" }],
    description: "Lengths always count segments. In scaled mode their physical reach changes with radius: segments × step factor × R." },
  { key: "blurFactor", kind: "range", label: "Blur factor (σ / radius)", group: "Brush scales", defaultValue: 0.5, min: 0, max: 1, step: 0.05,
    description: "Gaussian sigma = factor × R: defaults to 8, 4, 2 px. Zero disables blur." },
  { key: "minStrokeLength", kind: "integer", label: "Minimum stroke length", group: "Stroke geometry", defaultValue: 4, min: 1, max: 50,
    description: "Stroke length is measured in segments. Pixel length is approximately segments × step size, although curved strokes may differ slightly. Color-based stopping is allowed after this minimum." },
  { key: "maxStrokeLength", kind: "integer", label: "Maximum stroke length", group: "Stroke geometry", defaultValue: 16, min: 2, max: 100,
    description: "Stroke length is measured in segments. Pixel length is approximately segments × step size, although curved strokes may differ slightly. Must be at least the minimum." },
  { key: "stepFactor", kind: "number", label: "Stroke step (× radius)", group: "Stroke geometry", defaultValue: 1, min: 0.25, max: 2, step: 0.25,
    visibleWhen: { parameter: "distanceMode", equals: "radius" },
    description: "Step = factor × R: defaults to 16, 8, 4 px for the default brush sizes." },
  { key: "stepPixels", kind: "number", label: "Stroke step (px)", group: "Stroke geometry", defaultValue: 8, min: 0.25, max: 128, step: 0.25,
    visibleWhen: { parameter: "distanceMode", equals: "pixels" }, description: "Same step in image pixels for every brush radius." },
  { key: "directionFollowing", kind: "range", label: "Direction Following", group: "Stroke geometry", defaultValue: 0.5, min: 0, max: 1, step: 0.05,
    description: "α blends the previous direction with the local contour: 0 continues approximately straight; 1 follows the Sobel contour strongly." },
  { key: "strokeOpacity", kind: "range", label: "Stroke Opacity", group: "Stroke appearance", defaultValue: 1, min: 0.1, max: 1, step: 0.05, format: "percent",
    formatValue: (value) => `${Math.round(value * 100)}%`, description: "Alpha used for normal compositing. The next scale measures the actual composited canvas." },
  { key: "colorJitter", kind: "range", label: "Color Jitter", group: "Stroke appearance", defaultValue: 0, min: 0, max: 30, step: 1,
    description: "Deterministic per-channel RGB variation in the range ± this value. Zero preserves sampled colors." },
  { key: "strokeRendering", kind: "select", label: "Stroke Rendering", group: "Stroke rendering", defaultValue: "solid",
    options: [{ value: "solid", label: "Solid" }, { value: "textured", label: "Textured" }],
    description: "Both renderers consume the same generated PainterlyStroke geometry." },
  { key: "brushType", kind: "select", label: "Brush Type", group: "Stroke rendering", defaultValue: "soft",
    visibleWhen: { parameter: "strokeRendering", equals: "textured" },
    options: [
      { value: "soft", label: "Soft Brush" }, { value: "flat", label: "Flat Brush" },
      { value: "bristle", label: "Bristle Brush" }, { value: "dry", label: "Dry Brush" },
      { value: "rough", label: "Rough Brush" }, { value: "custom", label: "Custom Brush" },
    ], description: "Procedural coverage controls the brush mark; it does not change stroke placement or geometry." },
  { key: "textureSpacing", kind: "range", label: "Texture Spacing", group: "Stroke rendering", defaultValue: 0.3, min: 0.1, max: 1.5, step: 0.05,
    visibleWhen: { parameter: "strokeRendering", equals: "textured" },
    description: "Spacing relative to brush diameter. Lower spacing gives denser overlap; higher spacing shows individual impressions." },
  { key: "textureScale", kind: "range", label: "Texture Scale", group: "Stroke rendering", defaultValue: 1, min: 0.5, max: 2, step: 0.05,
    visibleWhen: { parameter: "strokeRendering", equals: "textured" },
    description: "Scales the brush footprint without changing the Hertzmann stroke path." },
  { key: "rotationOffset", kind: "number", label: "Rotation Offset (°)", group: "Stroke rendering", defaultValue: 0, min: -180, max: 180, step: 1,
    visibleWhen: { parameter: "strokeRendering", equals: "textured" },
    description: "Rotate the mask relative to the local stroke tangent. The default is 0° (Align to Stroke)." },
  { key: "customBrush", kind: "image", label: "Custom Brush Upload", group: "Stroke rendering", defaultValue: null,
    visibleWhen: [{ parameter: "strokeRendering", equals: "textured" }, { parameter: "brushType", equals: "custom" }],
    accept: "image/png,image/jpeg,image/webp", acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"], maxFileBytes: 8 * 1024 * 1024,
    maxSourceEdge: 512, maxSourcePixels: 512 * 512,
    description: "Alpha is used when meaningful; otherwise luminance becomes coverage. The mask is normalized to 0–1." },
  { key: "gridFactor", kind: "number", label: "Grid spacing (× radius)", group: "Placement", defaultValue: 1, min: 0.5, max: 4, step: 0.25,
    visibleWhen: { parameter: "distanceMode", equals: "radius" },
    description: "Cell side = max(1, round(factor × R)): defaults to 16, 8, 4 px." },
  { key: "gridPixels", kind: "integer", label: "Grid spacing (px)", group: "Placement", defaultValue: 8, min: 1, max: 256,
    visibleWhen: { parameter: "distanceMode", equals: "pixels" }, description: "Same cell side in image pixels for every brush radius." },
  { key: "errorThreshold", kind: "integer", label: "Error Threshold", group: "Placement", defaultValue: 2500, min: 0, max: 195075, step: 100,
    description: "Mean squared RGB error per cell. Lower threshold qualifies more cells and produces more strokes; higher threshold produces fewer, more abstract strokes." },
  { key: "seed", kind: "integer", label: "Seed", group: "Reproducibility", defaultValue: 12345, min: 0, max: 4294967295,
    description: "Reproduces flat-region directions and the shuffled drawing order." },
  { key: "background", kind: "select", label: "Canvas background", group: "Reproducibility", defaultValue: "#ffffff",
    options: [{ value: "#ffffff", label: "White" }], description: "Initialize once on white, then preserve the canvas between scales." },
];

export function resolvePainterlyParameters(parameters: PainterlyParameters) {
  const brushRadii = normalizeNumberList(parameters.brushSizes, brushSizesParameter);
  const legacySmoothing = (parameters as PainterlyParameters & { directionSmoothing?: number }).directionSmoothing;
  for (const definition of painterlyParameters) {
    if (definition.kind === "number-list" || !("min" in definition) || !("max" in definition)) continue;
    const value = parameters[definition.key];
    if (typeof value !== "number" || !Number.isFinite(value) ||
      value < definition.min! || value > definition.max! ||
      (definition.kind === "integer" && !Number.isInteger(value))) {
      throw new Error(`${definition.label} must be ${definition.kind === "integer" ? "an integer" : "a number"} from ${definition.min} to ${definition.max}.`);
    }
  }
  if (legacySmoothing !== undefined &&
    (!Number.isFinite(legacySmoothing) || legacySmoothing < 0 || legacySmoothing > 1)) {
    throw new Error("Direction smoothing must be a number from 0 to 1.");
  }
  if (parameters.minStrokeLength > parameters.maxStrokeLength) {
    throw new Error("Minimum stroke length must not exceed Maximum stroke length (both count segments).");
  }
  if (parameters.background !== "#ffffff") throw new Error("The initial canvas background must be white.");
  if (parameters.distanceMode !== "radius" && parameters.distanceMode !== "pixels") throw new Error("Choose scaled or fixed pixel units for step and grid.");
  if (parameters.strokeRendering !== "solid" && parameters.strokeRendering !== "textured") throw new Error("Choose Solid or Textured stroke rendering.");
  const brushTypes = new Set(["soft", "flat", "bristle", "dry", "rough", "custom"]);
  if (!brushTypes.has(parameters.brushType)) throw new Error("Choose a valid brush type.");
  if (parameters.brushType === "custom" && parameters.strokeRendering === "textured" && !parameters.customBrush) {
    throw new Error("Upload a Custom Brush image or choose a built-in Brush Type.");
  }
  return {
    ...parameters,
    directionFollowing: parameters.directionFollowing ?? (legacySmoothing === undefined ? 0.5 : 1 - legacySmoothing),
    brushRadii,
  };
}

export function resolveBrushTexture(parameters: PainterlyParameters): BrushTextureConfig | undefined {
  const resolved = resolvePainterlyParameters(parameters);
  if (resolved.strokeRendering !== "textured") return undefined;
  const type = resolved.brushType as BrushType;
  return {
    type,
    mask: getBrushMask(type, resolved.seed, resolved.customBrush, 64, 64),
    textureSpacing: resolved.textureSpacing,
    textureScale: resolved.textureScale,
    rotationOffset: resolved.rotationOffset,
  };
}

export function resolveScaleParameters(parameters: PainterlyParameters, radius: number) {
  const legacySmoothing = (parameters as PainterlyParameters & { directionSmoothing?: number }).directionSmoothing;
  const directionFollowing = parameters.directionFollowing ?? (legacySmoothing === undefined ? 0.5 : 1 - legacySmoothing);
  return {
    ...parameters,
    directionFollowing,
    brushRadius: radius,
    step: parameters.distanceMode === "radius" ? radius * parameters.stepFactor : parameters.stepPixels,
    gridSpacing: Math.max(1, Math.round(parameters.distanceMode === "radius" ? radius * parameters.gridFactor : parameters.gridPixels)),
    sigma: radius * parameters.blurFactor,
  };
}
