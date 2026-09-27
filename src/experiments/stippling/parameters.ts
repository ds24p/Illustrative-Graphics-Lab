import type { ParameterDefinition } from "../../core/parameters/types";

const seedParameter: ParameterDefinition = {
  key: "seed",
  kind: "integer",
  label: "Seed",
  description: "Reproduces the same candidate sequence and result.",
  defaultValue: 12345,
  min: 0,
  max: 4_294_967_295,
};

const dotSizeParameter: ParameterDefinition = {
  key: "dotSize",
  kind: "number",
  label: "Dot Size",
  description: "Visible dot diameter in pixels; it does not affect acceptance or spacing.",
  defaultValue: 3,
  min: 0.5,
  max: 12,
  step: 0.5,
};

export const placementParameters: ParameterDefinition[] = [
  seedParameter,
  {
    key: "targetPoints",
    kind: "integer",
    label: "Target Points",
    description: "Stop when this many dots have been accepted.",
    defaultValue: 20000,
    min: 1,
    max: 30000,
  },
  {
    key: "maxAttempts",
    kind: "integer",
    label: "Max Attempts",
    description: "Stop after this many candidate positions, even if the target is not reached.",
    defaultValue: 100000,
    min: 1,
    max: 100000,
  },
  {
    key: "intensityWindow",
    kind: "integer",
    label: "Intensity Window",
    description: "Radius of the local brightness rectangle around a rounded candidate position.",
    defaultValue: 2,
    min: 1,
    max: 8,
  },
  dotSizeParameter,
];

export const poissonParameters: ParameterDefinition[] = [
  seedParameter,
  {
    key: "targetPoints",
    kind: "integer",
    label: "Target Points",
    description: "Stop when this many spaced dots have been accepted.",
    defaultValue: 6000,
    min: 1,
    max: 10000,
  },
  {
    key: "maxAttempts",
    kind: "integer",
    label: "Max Attempts",
    description: "Stop after this many candidate positions, even if the target is not reached.",
    defaultValue: 20000,
    min: 1,
    max: 50000,
  },
  {
    key: "poissonRadius",
    kind: "number",
    label: "Poisson Radius",
    description: "Base radius R. Adaptive computes R x (I + 1); Uniform computes 2R. Exact checks sums of radii; Historical paints this value as stroke width.",
    defaultValue: 3,
    min: 0.5,
    max: 20,
    step: 0.5,
  },
  {
    key: "spacingMode",
    kind: "select",
    label: "Spacing Mode",
    description: "Adaptive spacing follows local brightness; Uniform uses the original sketch's constant 2R exclusion radius.",
    defaultValue: "adaptive",
    options: [
      { value: "adaptive", label: "Adaptive" },
      { value: "uniform", label: "Uniform" },
    ],
  },
  {
    key: "spacingCheck",
    kind: "select",
    label: "Spacing Check",
    description: "Exact Distance checks the sum of exclusion radii. Historical Occupancy Buffer checks a painted footprint from earlier points instead.",
    defaultValue: "exact",
    options: [
      { value: "exact", label: "Exact Distance" },
      { value: "historical-occupancy", label: "Historical Occupancy Buffer (approximation)" },
    ],
  },
  dotSizeParameter,
];

export const lloydParameters: ParameterDefinition[] = [
  seedParameter,
  {
    key: "initialPoints",
    kind: "integer",
    label: "Initial Points",
    description: "Seeded darkness-based sites to accept before relaxation begins.",
    defaultValue: 250,
    min: 1,
    max: 500,
  },
  {
    key: "maxAttempts",
    kind: "integer",
    label: "Max Attempts",
    description: "Maximum candidate positions during initial point generation.",
    defaultValue: 5000,
    min: 1,
    max: 10000,
  },
  {
    key: "iterations",
    kind: "integer",
    label: "Iterations",
    description: "Complete nearest-site assignment and centroid movement passes; 0 shows initial points.",
    defaultValue: 3,
    min: 0,
    max: 5,
  },
  {
    key: "lloydMode",
    kind: "select",
    label: "Ownership Strategy",
    description: "The historical cone technique exists only in the darkness-weighted form from the course sketch.",
    defaultValue: "weighted",
    options: [
      { value: "unweighted", label: "Sampled (Unweighted)" },
      { value: "weighted", label: "Sampled (Darkness-weighted)" },
      { value: "historical-cone", label: "Historical Cone (Weighted)" },
    ],
  },
  {
    key: "removeNearWhite",
    kind: "boolean",
    label: "Remove points on near-white areas",
    description: "After weighted relaxation: keep final sites when brightness at the truncated pixel coordinate is strictly below 0.95; 0 iterations shows all initial sites.",
    defaultValue: true,
    visibleWhen: { parameter: "lloydMode", oneOf: ["weighted", "historical-cone"] },
  },
  { ...dotSizeParameter, defaultValue: 4 },
];
