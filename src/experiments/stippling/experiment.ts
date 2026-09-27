import type { ExperimentDefinition } from "../../core/experiments/types";
import { placementEducation } from "./education";
import { placementCpuBackend } from "./methods/placement/backend.cpu";
import { lloydCpuBackend } from "./methods/lloyd/backend.cpu";
import { lloydWorkerBackend } from "./methods/lloyd/backend.worker";
import { lloydWebGpuBackend } from "./methods/lloyd/backend.webgpu";
import { lloydEducationalContent } from "./methods/lloyd/education";
import { poissonCpuBackend } from "./methods/poisson/backend.cpu";
import { poissonWorkerBackend } from "./methods/poisson/backend.worker";
import { poissonEducationalContent } from "./methods/poisson/education";
import { lloydParameters, placementParameters, poissonParameters } from "./parameters";
import type { StipplingParameters } from "./types";

export const stipplingExperiment: ExperimentDefinition<StipplingParameters> = {
  metadata: {
    id: "stippling",
    title: "Stippling",
    summary: "Build images from dots with random placement, Poisson spacing, or Lloyd relaxation.",
    category: "Illustrative image processing",
    tags: ["points", "stippling", "sampling", "Processing port"],
  },
  description: {
    overview:
      "Stippling represents tonal structure through the positions and density of dots.",
    steps: [
      "Convert the source image to Processing brightness.",
      "Generate point positions with the selected method.",
      "Render the resulting points to Canvas.",
    ],
  },
  parameters: [],
  defaultParameters: {
    seed: 12345,
    targetPoints: 20000,
    maxAttempts: 100000,
    intensityWindow: 2,
    dotSize: 3,
    poissonRadius: 3,
    spacingMode: "adaptive",
    spacingCheck: "exact",
    initialPoints: 250,
    iterations: 3,
    lloydMode: "weighted",
    removeNearWhite: true,
  },
  sampleImages: [
    {
      id: "studio-still-life",
      label: "Studio still life",
      src: "/samples/grayscale-still-life.png",
      alt: "A colorful still life with a broad Processing-brightness range.",
    },
  ],
  methodSelection: {
    label: "Stippling method",
    description: "Choose how stipple positions are generated.",
  },
  defaultMethodId: "placement",
  methods: [
    {
      id: "placement",
      label: "Random Placement",
      description: "Accepts random positions in proportion to local image darkness.",
      defaultParameters: { targetPoints: 20000, maxAttempts: 100000, dotSize: 3 },
      educationalContent: placementEducation,
      parameters: placementParameters,
      debugViews: [
        { id: "original", label: "Original", description: "The input image before processing." },
        { id: "processing-brightness", label: "Processing Brightness", description: "HSB value, max(R, G, B) / 255; not perceptual luminance." },
        { id: "darkness-density", label: "Darkness / Acceptance Probability", description: "One minus brightness: darker locations are more likely to accept a candidate." },
        { id: "final-stipples", label: "Final Stipples", description: "The accepted geometric points rendered at Dot Size." },
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: placementCpuBackend },
    },
    {
      id: "poisson",
      label: "Poisson-Disc",
      description: "Compare exact pairwise spacing with the course sketch's historical occupancy-buffer approximation.",
      educationalContent: poissonEducationalContent,
      defaultParameters: { targetPoints: 6000, maxAttempts: 20000, dotSize: 3, spacingCheck: "exact" },
      parameters: poissonParameters,
      debugViews: [
        { id: "original", label: "Original", description: "The input image before processing." },
        { id: "processing-brightness", label: "Processing Brightness", description: "HSB value, max(R, G, B) / 255; used in the local cutoff." },
        { id: "spacing-field", label: "Spacing Field", description: "Fixed-window exclusion-radius factor; white areas exceed the brightness cutoff." },
        { id: "occupancy-buffer", label: "Occupancy Buffer", description: "The actual binary raster used for lookup; black marks previously painted forbidden locations.", visibleWhen: { parameter: "spacingCheck", equals: "historical-occupancy" } },
        { id: "centers-over-occupancy", label: "Centers over Occupancy", description: "Accepted centers in red over a copy of the occupancy raster.", visibleWhen: { parameter: "spacingCheck", equals: "historical-occupancy" } },
        { id: "final-stipples", label: "Final Stipples", description: "Accepted positions rendered at Dot Size, not exclusion radius." },
      ],
      supportedBackends: ["cpu", "worker"],
      backendConditions: { worker: { parameter: "spacingCheck", equals: "exact" } },
      defaultBackend: "cpu",
      backends: { cpu: poissonCpuBackend, worker: poissonWorkerBackend },
    },
    {
      id: "lloyd",
      label: "Voronoi / Lloyd",
      description: "Compare sampled nearest-site ownership with the course sketch's weighted cone-rasterized ownership.",
      educationalContent: lloydEducationalContent,
      defaultParameters: {
        initialPoints: 250,
        maxAttempts: 5000,
        iterations: 3,
        lloydMode: "weighted",
        removeNearWhite: true,
        dotSize: 4,
      },
      parameters: lloydParameters,
      debugViews: [
        { id: "original", label: "Original", description: "The source before Processing brightness conversion." },
        { id: "processing-brightness", label: "Processing Brightness", description: "HSB value, max(R, G, B) / 255; not perceptual luminance." },
        { id: "darkness-weight", label: "Darkness / Weight Map", description: "One minus brightness. It weights centroids in Darkness-weighted mode; it is context only in Unweighted mode." },
        { id: "initial-points", label: "Initial Points", description: "Seeded darkness-based positions before relaxation." },
        { id: "voronoi-ownership", label: "Voronoi Ownership", description: "Colored 3 px sample regions assigned to the final sites, before output filtering.", visibleWhen: { parameter: "lloydMode", oneOf: ["unweighted", "weighted"] } },
        { id: "encoded-ownership", label: "Encoded Ownership", description: "Historical cone pass: RGB bytes encode site IDs, not source-image colors.", visibleWhen: { parameter: "lloydMode", equals: "historical-cone" } },
        { id: "decoded-ownership", label: "Decoded Ownership", description: "The historical cone owners remapped from encoded IDs to readable colors.", visibleWhen: { parameter: "lloydMode", equals: "historical-cone" } },
        { id: "before-final-iteration", label: "Points Before Final Iteration", description: "Site positions entering the last movement pass; initial sites when Iterations is 0." },
        { id: "after-final-iteration", label: "Points After Final Iteration", description: "All sites after movement, before the optional near-white presentation filter." },
        { id: "final-stipples", label: "Final Stipples", description: "Visible sites after optional weighted-mode near-white filtering." },
      ],
      supportedBackends: ["cpu", "worker", "webgpu"],
      backendConditions: {
        worker: { parameter: "lloydMode", oneOf: ["unweighted", "weighted"] },
        webgpu: { parameter: "lloydMode", oneOf: ["unweighted", "weighted"] },
      },
      defaultBackend: "cpu",
      backends: { cpu: lloydCpuBackend, worker: lloydWorkerBackend, webgpu: lloydWebGpuBackend },
    },
  ],
};
