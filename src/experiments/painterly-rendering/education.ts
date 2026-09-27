import type { MethodEducationalContent } from "../../core/experiments/types";

export const hertzmannEducation: MethodEducationalContent = {
  title: "Hertzmann-style painterly rendering",
  summary: "Approximate an image with curved brush strokes placed where the painting differs from a blurred reference. This is the single-scale reference stage (Phase 1A), which will be extended to multi-scale painting; it is not the complete original 1998 algorithm.",
  executionSummary: "Algorithm: Hertzmann-style painterly rendering · Strategy: single-scale curved strokes (Phase 1A) · Backend: CPU.",
  steps: [
    "Composite transparent source pixels over white, then blur RGB with a separable Gaussian. Compute Sobel gradients from Processing brightness, max(R, G, B) / 255, as in the course sketches.",
    "Compare the blurred reference with the initial white canvas. For every grid cell whose average squared RGB error exceeds the threshold, choose its highest-error pixel as a seed.",
    "Sample each stroke's color at its seed. Trace perpendicular to the local gradient; align consecutive directions and blend with the previous direction to control curvature.",
    "After the minimum segment count, stop if the existing canvas is closer to the local reference than the stroke color. Stop at the image boundary or the maximum segment count as well.",
    "Generate the entire layer against the same initial canvas, shuffle its strokes with the seed, then draw solid quadratic curves with constant radius and round caps and joins.",
  ],
  mathematics: [
    { label: "Gradient and contour direction", expressions: ["∇I = (Ix, Iy) = (SobelX(I), SobelY(I))", "d = normalize(−Iy, Ix)"], explanation: "The gradient crosses an edge. The perpendicular direction follows its contour. The direction-field debug view shows the contour arrows." },
    { label: "Canvas error", expressions: ["E = (Rref − Rcanvas)² + (Gref − Gcanvas)² + (Bref − Bcanvas)²", "seed cell if mean(E) > Error threshold"], explanation: "RGB channels use 0–255, so E ranges from 0 to 195075. The default 2500 is a squared RGB distance of 50²." },
    { label: "Direction continuity", expressions: ["if dot(dprevious, dlocal) < 0: dlocal = −dlocal", "dnext = normalize(s × dprevious + (1 − s) × dlocal)"], explanation: "s is Direction smoothing. Sign alignment avoids zig-zags when the gradient changes sign." },
  ],
  parameters: [
    { name: "Brush radius and derived distances", description: "Radius defaults to 8 px. Step and grid default to one radius; Gaussian sigma defaults to half a radius. Their factors continue to follow radius changes." },
    { name: "Stroke lengths", description: "Minimum 4 and maximum 16 count segments, not pixels or control points. A boundary may shorten the final segment or stop before the minimum. Invalid min > max values produce an explanatory error." },
    { name: "Direction smoothing", description: "0 follows the local field closely; 1 keeps the initial direction. Flat seeds receive a deterministic direction, and strokes retain their direction through flat regions." },
    { name: "Seed and background", description: "Seed 12345 controls flat-region directions and draw order. The canvas starts white. A seed with no room to move is rendered as a round dab." },
  ],
  characteristics: [
    "One grid pass and one brush radius per rendering. The error map shows the initial pre-layer error.",
    "Uniform opaque color per stroke, sampled from the blurred reference. Gaussian boundaries use clamped samples.",
    "Pure stroke generation is separate from solid Canvas2D rendering and PNG export.",
    "The CPU reference limits allocations to 200,000 grid cells and a potential 2,000,000 control points; larger requests report how to reduce the workload.",
  ],
  computation: {
    cpu: "Runs the blur, Sobel field, error map, grid selection, and stroke tracing in JavaScript. The experiment renderer draws the resulting strokes with Canvas2D.",
    gpu: "Reserved for a later phase. Phase 1A exposes only CPU execution.",
  },
};
