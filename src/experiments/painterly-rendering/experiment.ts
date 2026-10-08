import type { ExperimentDefinition } from "../../core/experiments/types";
import { publicUrl } from "../../core/assets/publicUrl";
import { painterlyDebugViews } from "./debug";
import { hertzmannEducation } from "./education";
import { hertzmannCpuBackend } from "./methods/hertzmann/backend.cpu";
import { painterlyDefaults, painterlyParameters } from "./parameters";
import { renderPainterlyStrokes } from "./renderers/textured";
import type { PainterlyParameters } from "./types";

export const painterlyRenderingExperiment: ExperimentDefinition<PainterlyParameters> = {
  metadata: {
    id: "painterly-rendering",
    title: "Painterly Rendering",
    summary: "Build a painting from large structural strokes to small corrections of the remaining image error.",
    category: "Illustrative image processing",
    tags: ["painterly", "curved strokes", "Hertzmann", "CPU", "multi-scale", "stroke character", "procedural brushes", "Phase 2A"],
  },
  description: {
    overview: "Hertzmann-style painterly rendering using coarse-to-fine curved strokes with interchangeable procedural brush renderers (Phase 2A).",
    steps: hertzmannEducation.steps,
    formula: "∇I = (Ix, Iy); d = normalize(−Iy, Ix)",
  },
  parameters: [],
  defaultParameters: painterlyDefaults,
  listingImage: {
    id: "painterly-rendering-result", label: "Painterly rendering result", src: publicUrl("samples/painterly-rendering-result.png"),
    alt: "A colorful still life rendered with painterly brush strokes.",
  },
  sampleImages: [{
    id: "studio-still-life", label: "Studio still life", src: publicUrl("samples/grayscale-still-life.png"),
    alt: "A colorful still life with curved objects and contrasting edges.",
  }],
  methodSelection: { label: "Painterly algorithm", description: "Strategy: one multi-scale stroke generator with Solid or procedural Textured rendering (Phase 2A)." },
  defaultMethodId: "hertzmann",
  methods: [{
    id: "hertzmann", label: "Hertzmann-style painterly rendering",
    description: "Multi-scale curved strokes (Phase 2A). The same PainterlyStroke geometry can be rendered as solid marks or procedural textured brush impressions.",
    educationalContent: hertzmannEducation,
    parameters: painterlyParameters,
    debugViews: painterlyDebugViews,
    debugSelection: { groupLabel: "Brush scale", viewLabel: "Debug view", initialViewId: "canvas-after-layer" },
    supportedBackends: ["cpu"], defaultBackend: "cpu", backends: { cpu: hertzmannCpuBackend },
  }],
  renderers: { strokes: renderPainterlyStrokes },
};
