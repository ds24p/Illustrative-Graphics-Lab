import type { MethodEducationalContent, MethodEducationalContentDefinition } from "../../../../core/experiments/types";

export const lloydEducation: MethodEducationalContent = {
  title: "Voronoi / Lloyd Stippling",
  summary:
    "Seeded darkness-based placement initializes the sites. Each Lloyd iteration assigns sampled image positions to their nearest site and moves sites toward regional centroids.",
  executionSummary: "Sampled Lloyd supports CPU, Web Worker, and WebGPU. Sample ownership is parallel; WebGPU has fixed setup cost and uses f32 coordinates.",
  collapseDetails: true,
  steps: [
    "Generate initial sites using the course sketch's seeded Placement rule and fixed brightness neighborhood.",
    "Sample the image at x,y = 0, 3, 6, ... and assign each sample to its Euclidean-nearest current site.",
    "Accumulate positions equally in Unweighted mode or using darkness weights in Darkness-weighted mode.",
    "Move each site to its centroid when its accumulated weight is positive; otherwise leave it unchanged.",
    "Repeat assignment and movement for the selected number of iterations.",
    "Optionally remove weighted-mode points whose final source location is near white, then render dots.",
  ],
  mathematics: [
    {
      label: "Initialization",
      expressions: ["Iavg = mean(max(R, G, B) / 255)", "U ~ Uniform[0, 1)", "accept if U > Iavg"],
      explanation: "This is not uniform random initialization: image darkness already influences the initial site density. The fixed window is [round(x)-2, round(x)+2) x [round(y)-2, round(y)+2).",
    },
    {
      label: "Nearest-site ownership",
      expressions: ["owner(x) = argmin_i ||x - p_i||^2"],
      explanation: "Each 3 px grid sample chooses the site with the smallest squared Euclidean distance. Exact ties go to the earliest site in the list.",
    },
    {
      label: "Unweighted Lloyd",
      expressions: ["p_i' = (1 / N_i) sum_{x in V_i} x"],
      explanation: "V_i contains the samples owned by site i, and N_i is their count. Every owned sample pulls equally toward the region's average position.",
    },
    {
      label: "Darkness-weighted Lloyd",
      expressions: ["w(x) = 1 - I(x)", "p_i' = sum_{x in V_i} w(x) x / sum_{x in V_i} w(x)"],
      explanation: "Black has weight 1, middle gray 0.5, and white 0. Dark owned samples pull the centroid more strongly; a zero-weight site stays put.",
    },
  ],
  parameters: [
    { name: "Initial Points / Max Attempts", description: "Seeded initial placement stops at the first reached limit. This is separate from Lloyd movement." },
    { name: "Iterations", description: "One iteration equals one original Processing key press. Zero shows the initial sites; more iterations change visual character rather than always improving it." },
    { name: "Ownership Strategy", description: "Sampled Unweighted averages positions equally. Sampled Darkness-weighted uses w = 1 - I at sampled image positions. Either sampled strategy can run on CPU, Worker, or WebGPU." },
    { name: "Remove points on near-white areas", description: "After at least one weighted iteration, keep only sites with source brightness at trunc(final x,y) < 0.95. It does not change centroids; zero iterations always show the complete initial set." },
    { name: "Dot Size", description: "Visible dot diameter only; it does not affect initialization, ownership, or movement." },
  ],
  characteristics: [
    "Regions are approximated on the original 3 px sample grid, not continuous geometry or every image pixel.",
    "The ownership debug view colors the regions of all final sites using the same nearest-site rule; cells are expanded from that grid for display.",
    "The original slow modes do not apply the accelerated variant's 20 px border clamp. Neither does this implementation.",
    "Unweighted mode leaves all final sites visible, as in the original unweighted rendering. The optional near-white filter belongs only to weighted output.",
  ],
  computation: {
    cpu: "The reference TypeScript search runs on the browser main thread and checks every site for every sample. Large site sets or repeated iterations may pause interaction.",
    worker: "The same reference CPU algorithm runs outside the main thread. For identical input and seed it matches CPU deterministically and leaves controls responsive, but messages and buffer transfer add overhead.",
    gpu: "WGSL evaluates many sample-to-site distances in parallel. Ownership, centroid reduction, and point updates stay on GPU between iterations; normally only final points return to CPU. Setup and dispatch cost can dominate small jobs. WGSL uses f32, so coordinates may differ slightly from CPU/Worker despite the same rules.",
  },
};

const historicalConeEducation: MethodEducationalContent = {
  title: "Voronoi / Lloyd: Historical Cone Rasterization",
  summary:
    "This weighted course-sketch strategy uses indexed, depth-tested polygonal cones to approximate ownership regions, then moves sites toward full-resolution darkness-weighted centroids. The web port reproduces the idea with a deterministic CPU rasterizer.",
  executionSummary: "CPU only: Historical Cone is an algorithmic strategy, not a backend. This web port reproduces its depth competition in software.",
  collapseDetails: true,
  steps: [
    "Initialize sites with the same seeded darkness-based Placement rule as Sampled CPU.",
    "For each site, project a 32-facet cone with apex z = 1 and ring z = -300; the ring radius is image width + height.",
    "At every pixel, retain the closest visible cone depth and its RGB-encoded site index. Gray 127 denotes uncovered background.",
    "Decode the winning index and accumulate x, y, and total weight over every image pixel, using weight = 1 - Processing brightness.",
    "Move each site to its weighted centroid and apply the sketch's 20 px border clamp when image dimensions permit it; preserve sites with zero weight.",
    "Repeat ownership and movement for Iterations, then optionally filter near-white final positions before rendering PointResult dots.",
  ],
  mathematics: [
    {
      label: "Index colors",
      expressions: ["r = i % 64", "g = (i >> 6) % 64", "b = (i >> 12) % 64", "i = r + (g << 6) + (b << 12)"],
      explanation: "RGB channels encode an 18-bit point ID, not the source image color. Background (127,127,127) decodes outside the supported site range and is ignored.",
    },
    {
      label: "32-facet cone depth",
      expressions: ["t = projected distance to apex / facet ring distance", "z = 1 - 301t", "higher z wins"],
      explanation: "Equal cone slopes make depth competition approximate nearest-site ownership. Polygonal facets can place boundaries differently from exact Euclidean bisectors.",
    },
    {
      label: "Full-pixel weighted centroid",
      expressions: ["w(x,y) = 1 - I(x,y)", "p_i' = sum(owned pixels x w) / sum(owned pixels w)"],
      explanation: "Every pixel contributes, unlike the reference Sampled CPU method's 3 px grid. Sites with zero total weight remain unchanged in this safe port.",
    },
  ],
  parameters: [
    { name: "Seed / Initial Points / Max Attempts", description: "Control the shared deterministic initial sites, so the ownership strategies begin from the same positions." },
    { name: "Iterations", description: "Each pass renders ownership from the sites produced by the preceding pass, then moves them. Zero leaves initial sites unchanged." },
    { name: "Ownership Strategy", description: "Historical Cone is available only with darkness weighting, as in the original accelerated sketch." },
    { name: "Remove points on near-white areas", description: "After movement, keep only sites whose source brightness at the truncated final pixel is strictly below 0.95. Filtering does not alter centroids." },
    { name: "Dot Size", description: "Visible diameter only; it does not change ownership or movement." },
  ],
  characteristics: [
    "The encoded ownership debug view shows the actual RGB index bytes from the depth competition; its colors are not image colors. The decoded view remaps those same owner IDs for readability.",
    "Ownership debug views correspond to the sites entering the last movement pass, not the already moved final sites.",
    "The original P3D renderer used graphics-hardware rasterization and depth testing. This CPU reproduction does not promise identical edge, clipping, antialiasing, or depth-precision pixels.",
    "The Processing source divides by zero for empty/white-owned regions. This port leaves zero-weight sites unchanged to prevent invalid coordinates.",
    "For dimensions greater than 40 px the historical 20 px margin is applied; smaller images fall back to valid [0, dimension - 1] bounds. Sampled CPU remains unclamped.",
  ],
  computation: {
    cpu: "The main-thread software rasterizer evaluates cone facets and accumulates all owned pixels. The course sketch used graphics-hardware depth competition; this port keeps that distinct strategy understandable without changing its geometry.",
    worker: "Not offered for Historical Cone. Moving the same rasterizer off the main thread would improve responsiveness, but would still be CPU computation.",
    gpu: "Not offered for this historical strategy. Its original graphics-based ownership idea is distinct from the sampled WGSL Lloyd backend.",
  },
};

export const lloydEducationalContent: MethodEducationalContentDefinition = {
  variants: [
    { when: { parameter: "lloydMode", equals: "historical-cone" }, content: historicalConeEducation },
    { when: { parameter: "lloydMode", oneOf: ["unweighted", "weighted"] }, content: lloydEducation },
  ],
};
