# Dithering / Halftoning

This experiment family compares binary halftoning, regular RGB quantization,
palette quantization, color error diffusion, and automatic palette generation.
All algorithms are independent from React. The experiment definition supplies
method metadata, parameters, backends, and debug-view descriptions to the
generic workspace UI.

## Method inventory

| Method | CPU | WebGPU | Main parameters | Output |
| --- | --- | --- | --- | --- |
| Threshold | Yes | Yes | Threshold | Binary raster |
| Random Threshold | Yes | Yes | Threshold, amplitude, seed | Binary raster |
| Floyd-Steinberg 1D | Yes | No | None | Binary raster |
| Floyd-Steinberg 2D | Yes | No | None | Binary raster |
| Floyd-Steinberg 2D with Lines | Yes | No | Line length | Binary raster |
| RGB Levels | Yes | Yes | Levels per channel | RGB raster |
| RGB Levels + Ordered Dithering | Yes | Yes | Levels per channel, Bayer size | RGB raster |
| Fixed Palette Quantization | Yes | No | Palette, dithering strategy | RGB raster |
| Generated Palette - Median Cut | Yes | No | Palette size, dithering strategy | RGB raster |

The fixed and generated palette methods both reuse the same nearest-color
mapping and RGB Floyd-Steinberg implementation. `Dithering strategy = None`
performs direct quantization. `Floyd-Steinberg` diffuses the three-component
quantization error through raster order.

## Origins

The five black-and-white methods originate from the Processing assignment:
Threshold, Random Threshold, Floyd-Steinberg 1D, Floyd-Steinberg 2D, and the
custom line-based Floyd-Steinberg variant. Their Processing brightness model
and boundary behavior are intentionally preserved.

RGB Levels, RGB Ordered Dithering, arbitrary fixed palettes, custom palettes,
color Floyd-Steinberg, Median Cut, and all WebGPU backends were added for this
web project.

## Parallel and sequential methods

Threshold, seeded Random Threshold, RGB Levels, and RGB Ordered Dithering are
pixel-independent. A pixel depends only on its source value, coordinates, and
parameters, so these methods map naturally to one WebGPU invocation per pixel.

Floyd-Steinberg methods are sequential because each decision modifies future
working values. Median Cut generation is also CPU-only: it repeatedly analyzes,
sorts, and partitions shared color sets. Applying an already generated palette
is pixel-independent when error diffusion is disabled, but that additional GPU
backend is outside the completed scope.

## Deterministic Median Cut policy

1. Sample at most 65,536 visible source pixels using a deterministic uniform stride.
2. Select the splittable box with the largest channel range.
3. Break box-selection ties by larger sample count, then existing box order.
4. Select the largest-range channel, with red, green, blue as the tie order.
5. Sort deterministically by that channel and then RGB, and split at the sample median.
6. Average each final box and round each representative channel to the nearest byte.
7. Stop early if no box has color variation, rather than inventing duplicate colors.

Palette generation and palette application have separate functions and timing
stages. The generated palette is passed to the same application code used by
fixed palettes.

## Shared infrastructure

- `core/webgpu/device.ts`: feature detection plus cached adapter/device setup.
- `core/webgpu/rgbaCompute.ts`: RGBA upload, compute dispatch, synchronization,
  readback, resource cleanup, and stage timing.
- `core/execution/runExperiment.ts`: backend selection and CPU fallback.
- `core/execution/compareBackends.ts`: CPU/WebGPU execution and raster comparison.
- `nearestPaletteColor.ts`: squared RGB distance and deterministic first-entry ties.
- `methods/fixed-palette/algorithm.floyd-steinberg.cpu.ts`: reusable palette-based
  RGB error diffusion.
- Generic raster rendering and named debug-view infrastructure.

## Preserved behavior and limits

- Processing brightness is `max(R, G, B) / 255`, not perceptual luminance.
- Original threshold comparison differences, raster order, diffusion weights,
  line clipping, overlap, and full line compensation are covered by regression tests.
- Random Threshold uses a coordinate-and-seed hash so CPU and WebGPU produce the
  same reproducible field; it does not reproduce Processing's RNG sequence.
- Floyd-Steinberg working buffers are not clamped and raster order is not serpentine.
- Palette distance is squared Euclidean RGB, not a perceptual color metric.
- Median Cut ignores fully transparent samples and may return fewer than the
  requested colors when the sampled image has insufficient variation.
- Median Cut uses deterministic sampling on large images, not every source pixel.
- WebGPU timing includes setup, synchronization, copy, and readback and should not
  be read as a standalone shader benchmark.

No required TODO remains for the declared Dithering / Halftoning scope.
