import type { MethodEducationalContent } from "../../core/experiments/types";

export const hertzmannEducation: MethodEducationalContent = {
  title: "Hertzmann-style painterly rendering",
  summary: "Phase 2A keeps one Hertzmann multi-scale stroke generator and lets Solid or procedural Textured renderers show how brush coverage changes the same geometry.",
  executionSummary: "Algorithm: multi-scale Hertzmann strokes · Renderers: Solid or procedural Canvas2D brush masks · Backend: CPU.",
  steps: [
    "Generate the same PainterlyStroke[] as before: normalize brush scales, compute residual error, select grid seeds, follow Sobel contours, and honor stroke length, color, opacity, and jitter.",
    "Choose Solid or Textured rendering. The choice is downstream of stroke generation, so switching the renderer does not independently regenerate paths.",
    "For Textured mode, create one deterministic normalized coverage mask M(u,v) for the selected procedural brush or uploaded custom brush. Cache it for the run.",
    "Place mask stamps by accumulated arc length along each curved polyline. Orient each footprint to the local tangent, maintain tangent sign continuity, apply Rotation Offset, and overlap samples according to Texture Spacing.",
    "Tint every stamp with the one PainterlyStroke color. The mask only controls coverage: local alpha is Stroke Opacity × M(u,v), composited with normal source-over Canvas2D blending.",
    "Read back the actual rendered canvas before the next scale. Textured gaps therefore remain visible to residual-error refinement and can receive later corrective strokes.",
  ],
  mathematics: [
    { label: "Hertzmann geometry", expressions: ["∇I = (Ix, Iy) = (SobelX(I), SobelY(I))", "d_contour = normalize(−Iy, Ix)", "d_new = normalize((1 − α)d_previous + αd_contour)"], explanation: "Direction Following α controls the path: 0 continues approximately straight and 1 follows the contour strongly. Sign continuity flips d_contour when dot(d_previous, d_contour) < 0." },
    { label: "Residual error and placement", expressions: ["E(x,y) = ||I_reference(x,y) − I_canvas(x,y)||²", "E = (Rref − Rcanvas)² + (Gref − Gcanvas)² + (Bref − Bcanvas)²"], explanation: "Grid cells whose mean error exceeds Error Threshold receive maximum-error seeds. The canvas is the actual Solid or Textured composited image." },
    { label: "Procedural brush coverage", expressions: ["M(u,v) ∈ [0,1]", "M = 0 → no paint contribution", "M = 1 → full local paint contribution", "alpha(x,y) = Stroke Opacity × M(u,v)"], explanation: "The mask changes coverage, edge softness, gaps, fibers, or grain. It does not generate new RGB colors and is not a physical paint or bristle simulation." },
    { label: "Arc-length placement", expressions: ["s0 = 0", "si = s(i−1) + ||pi − p(i−1)||", "stampDistance = Texture Spacing × (2 × radius)", "stampSize = 2 × radius × Texture Scale"], explanation: "Texture density depends on physical distance along the path rather than on the number of Hertzmann integration segments. Interpolation places stamps inside segments when needed." },
    { label: "Scale relationships", expressions: ["σ(R) = blurFactor × R", "step(R) = stepFactor × R", "grid(R) = max(1, round(gridFactor × R))"], explanation: "The brush renderer changes appearance while the generator keeps the same stroke representation. Texture Scale changes footprint size, and Rotation Offset changes orientation without changing path geometry." },
  ],
  parameters: [
    { name: "Brush scales", description: "Brush Sizes are whole-pixel radii, normalized largest first. Blur Factor controls the reference sigma for each scale." },
    { name: "Stroke geometry", description: "Minimum and Maximum Stroke Length count segments. Direction Following controls contour interpolation; these controls affect PainterlyStroke geometry before rendering." },
    { name: "Stroke appearance", description: "Stroke Opacity controls compositing and Color Jitter varies one base stroke color deterministically. No texture stamp creates a new color." },
    { name: "Stroke rendering", description: "Solid uses rounded constant-width paths. Textured uses Soft, Flat, Bristle, Dry, Rough, or Custom coverage masks with Texture Spacing, Texture Scale, and Rotation Offset." },
    { name: "Placement", description: "Grid spacing and Error Threshold determine where strokes are placed. A lower threshold qualifies more cells; it is an error criterion rather than a direct density slider." },
    { name: "Reproducibility", description: "Seed controls flat directions, jitter, draw order, and procedural mask generation. Identical inputs and parameters reproduce the same mask and stroke set." },
  ],
  characteristics: [
    "Hertzmann generation determines placement, path, length, brush scale, stroke color, opacity, and jitter. The selected renderer determines only brush footprint and coverage.",
    "Soft Brush uses smooth radial falloff; Flat Brush is mostly uniform with a defined edge; Bristle Brush has coherent longitudinal fibers; Dry Brush has coherent broken gaps; Rough Brush is granular but mostly continuous.",
    "Stroke Paths is geometry-only and stays identical for Solid and Textured when the pre-generated stroke set is held fixed. Layer Strokes Only follows the selected renderer.",
    "Custom Brush accepts PNG, JPEG, or WebP. Meaningful alpha becomes coverage; otherwise luminance becomes coverage. The mask is normalized to [0,1] and shown in the grayscale preview.",
    "The optional Single Stroke Inspector remains deferred. It would add a separate interactive seed-selection execution path; Stroke Paths provides geometry inspection without changing the generator.",
    "These masks are procedural texture-based brush models, not simulations of paint, pigment, fluids, or physical bristle mechanics.",
  ],
  computation: {
    cpu: "JavaScript computes the Hertzmann stages and deterministic masks. Canvas2D performs arc-length stamp placement, normal alpha compositing, and pixel readback between scales. Masks are generated once and cached by type, resolution, seed, or custom image identity.",
    gpu: "Reserved for a later phase. Phase 2A exposes CPU + Canvas2D only.",
  },
};
