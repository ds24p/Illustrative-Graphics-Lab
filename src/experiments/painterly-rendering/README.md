# Painterly Rendering — Phase 2A

Route: `/experiments/painterly-rendering`.

Phase 2A keeps one CPU Hertzmann multi-scale generator and adds procedural textured brush renderers. The generator still creates the same `PainterlyStroke[]` representation. That geometry can be sent to the existing Solid renderer or to the procedural Textured renderer. Changing the renderer does not create another Hertzmann algorithm.

Textures are coverage masks, not RGB textures or physical paint simulation:

```text
M(u,v) ∈ [0,1]
alpha(x,y) = StrokeOpacity × M(u,v)
```

Canvas2D applies normal source-over compositing. The actual rendered canvas is read back between scales, so gaps and partial coverage from a textured brush affect later residual-error refinement.

## Built-in procedural brushes

- **Soft Brush:** Gaussian-like radial falloff with smooth edges.
- **Flat Brush:** mostly uniform rounded-rectangular footprint with a sharper boundary.
- **Bristle Brush:** coherent longitudinal sinusoidal bands across the brush width; the same mask is transported along curved paths.
- **Dry Brush:** coherent low-coverage regions create broken paint and gaps.
- **Rough Brush:** continuous granular variation with irregular edges; it retains more coverage than Dry Brush.

Masks are generated in `brushes.ts` at a fixed resolution and cached by type, seed, resolution, or custom image identity. No PNG/JPEG/WebP brush assets are stored in the repository, and no `Math.random()` is used for masks or stroke texture placement.

## Textured placement

For every stroke polyline `p0 … pn`, accumulated arc length is computed:

```text
s0 = 0
si = s(i−1) + ||pi − p(i−1)||
stampDistance = TextureSpacing × (2 × stroke radius)
stampSize = 2 × stroke radius × TextureScale
```

Texture samples are interpolated inside polyline segments. Their local tangent follows the curve, and tangent sign continuity flips a tangent when its dot product with the previous tangent is negative. A short blend removes abrupt angle changes at corners. Rotation Offset then rotates the footprint relative to the tangent. Lower spacing creates denser overlap; higher spacing exposes individual impressions.

The mask is tinted with the one `PainterlyStroke.color`; texture samples never generate independent colors. Stroke Opacity and mask coverage combine in the stamp alpha. Solid mode keeps round caps, round joins, and constant stroke thickness from Phase 1C.

## Controls and preview

The **Stroke Rendering** group contains Solid/Textured selection. Textured mode exposes Brush Type, Texture Spacing, Texture Scale, Rotation Offset, and Custom Brush Upload. A live grayscale Brush Mask preview shows black `M=0` and white `M=1` and updates with the selected type.

Custom PNG, JPEG, and WebP uploads use alpha when it has meaningful variation; otherwise luminance is used. The sampled mask is normalized to `[0,1]`. Invalid image data is rejected with an explanatory error.

## Debug views

All Phase 1B/1C views remain available: Blurred Reference, Gradient Magnitude, Stroke Direction Field, Error Before Layer, Stroke Seeds, Canvas After Layer, Stroke Paths, and Layer Strokes Only. `Brush Mask` is added as a grayscale view for the selected procedural or custom mask.

Stroke Paths is geometry-only. With identical generator parameters and a fixed pre-generated stroke set, it is identical for Solid and all Textured brush types. In a full multi-scale run, textured coverage can legitimately change later-layer residual error and therefore later stroke placement; this is the intended feedback behavior.

## Custom renderer architecture

```text
Image
  ↓
Hertzmann generator → PainterlyStroke[]
  ├── Solid renderer
  └── Textured renderer → procedural coverage mask → Canvas2D
```

`methods/hertzmann/algorithm.cpu.ts` remains independent of Canvas2D and brush representation. `renderers/solid.ts` remains the canonical solid path. `renderers/textured.ts` owns arc-length sampling, tangent orientation, mask stamping, persistent textured feedback, and textured export.

The optional Single Stroke Inspector is deferred. Watercolor, pigment diffusion, wet-on-wet effects, physical bristle mechanics, WebGPU, named style presets, and physical paint mixing are also outside Phase 2A.

## Validation

Run:

```text
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
git diff --check
```

The mask, renderer, geometry, custom upload, opacity, deterministic placement, tangent continuity, bounds, debug, and existing Phase 1A–1C suites are covered by **360 tests in 45 files**. `npm.cmd run build` passes; Vite reports the existing main-bundle warning at approximately 533 kB before gzip. Visual checks should compare the same straight, curved, and corner stroke across Solid, Soft, Flat, Bristle, Dry, and Rough, then compare Texture Spacing 0.2, 0.5, and 1.0. The in-app browser may need a fresh manual run if its automation usage limit has been reached.
