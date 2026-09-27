import type { ExperimentDefinition } from "../../core/experiments/types";
import { painterlyDebugViews } from "./debug";
import { hertzmannEducation } from "./education";
import { hertzmannCpuBackend } from "./methods/hertzmann/backend.cpu";
import { painterlyDefaults, painterlyParameters } from "./parameters";
import { renderSolidStrokes } from "./renderers/solid";
import type { PainterlyParameters } from "./types";

export const painterlyRenderingExperiment: ExperimentDefinition<PainterlyParameters> = {
  metadata: {
    id: "painterly-rendering",
    title: "Painterly Rendering",
    summary: "Paint a blurred image reference with curved strokes that follow its contours.",
    category: "Illustrative image processing",
    tags: ["painterly", "curved strokes", "Hertzmann", "CPU", "Phase 1A"],
  },
  description: {
    overview: "Hertzmann-style painterly rendering using single-scale curved strokes (Phase 1A).",
    steps: hertzmannEducation.steps,
    formula: "∇I = (Ix, Iy); d = normalize(−Iy, Ix)",
  },
  parameters: [],
  defaultParameters: painterlyDefaults,
  sampleImages: [{
    id: "studio-still-life", label: "Studio still life", src: "/samples/grayscale-still-life.png",
    alt: "A colorful still life with curved objects and contrasting edges.",
  }],
  methodSelection: { label: "Painterly algorithm", description: "Strategy: single-scale curved strokes (Phase 1A)." },
  defaultMethodId: "hertzmann",
  methods: [{
    id: "hertzmann", label: "Hertzmann-style painterly rendering",
    description: "Single-scale curved strokes (Phase 1A), rendered as solid brush marks on white.",
    educationalContent: hertzmannEducation,
    parameters: painterlyParameters,
    debugViews: painterlyDebugViews,
    supportedBackends: ["cpu"], defaultBackend: "cpu", backends: { cpu: hertzmannCpuBackend },
  }],
  renderers: { strokes: renderSolidStrokes },
};
