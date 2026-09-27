# Stippling

This family contains Random Placement, two Poisson-Disc spacing checks, and
Voronoi/Lloyd. Exact Distance is the course sketch's explicit pairwise check.
Historical Occupancy Buffer is its separate FAST teaching variant, not a faster
backend for the same mathematical rule.

`intensity.ts` converts RGB to Processing brightness. `localAverage.ts` and
`random.ts` are reusable by later methods. The Placement algorithm returns
ordered point positions and attempt statistics, without Canvas or React.
`backend.cpu.ts` converts those positions to a `PointResult` and optionally
creates debug views. The generic Canvas renderer draws the result and handles
PNG export.

The original sketch draws 500 attempts per frame and uses unseeded Processing
`random()`. This port uses a seeded stream and stops at Target Points or Max
Attempts. The acceptance decision remains `U > local average brightness`.
Processing's `pointRadius` was passed as both ellipse width and height; the web
parameter is called Dot Size and represents diameter. Its 3 px default is
slightly larger than the original 2 px because the sample image is scaled down
in the web preview; choosing 2 px reproduces the original drawn diameter.

Poisson-Disc draws only candidate x and y, checks the fixed radius-2 brightness
window, and rejects `Iavg > 0.95`. Eligible candidates store a separate
exclusion radius: `R * (Iavg + 1)` in adaptive mode or `2R` in uniform mode.
They are accepted when their center distance from every existing point is at
least the sum of both stored exclusion radii. The CPU implementation compares
squared distances to avoid square roots; equality remains accepted. Dot Size
only determines `PointResult.radius = Dot Size / 2` for rendering. The naive
distance scan is intentionally O(attempts * accepted points).

The historical Poisson strategy shares the seed, candidate positions, fixed
local brightness window, strict `Iavg > 0.95` cutoff, radius calculation,
budgets, visible Dot Size, and statistics. It uses a `Uint8Array` occupancy
raster instead of scanning accepted points: 0 means free and 1 occupied. For
each eligible candidate it checks the rounded center pixel, then paints a
round footprint with **stroke width** `testRadius` after acceptance. The
footprint's geometric radius is therefore `testRadius / 2`, not `testRadius`.
The web rule samples integer-indexed pixel centers whose squared distance from
the floating-point point center is at most `(testRadius / 2)^2`; it also marks
the rounded insertion pixel so very narrow strokes cannot leave their own
lookup center free. This is a deterministic binary approximation of
Processing's antialiased `PGraphics.point()` stroke, not pixel-exact parity.
Rounding to `width` or `height` rejects the candidate rather than reading
beyond the typed array, matching the sketch's expected non-white out-of-bounds
lookup behavior. Marks near an edge are clipped to the image.

These rules are deliberately non-equivalent. With Uniform `R = 3`, Exact
Distance stores `r = 6` and equal points need at least 12 px between centers.
The historical method paints a width-6 mark (roughly 3 px radius) and only
asks whether the *future center* lies in an earlier footprint. Its own radius
does not participate in a symmetric sum. Adaptive radii make this temporal
asymmetry particularly visible. The original FAST sketch painted random
colors, but only non-white status mattered; the port uses fixed occupancy 1
and does not consume the seeded candidate RNG for colors. The optional
Occupancy Buffer debug view displays the actual raster used for checking. A
separate debug copy marks accepted centers in red without changing that raster.

The Poisson web defaults are 6,000 target points and 20,000 attempts, below the
course sketch's 15,000 / 500,000 because this reference method can be expensive.
Method-specific defaults leave Random Placement's settings intact.

Voronoi / Lloyd uses the other course sketch's initial Placement rule, with
`random(0, width - 1)` / `random(0, height - 1)` coordinates and a fixed
radius-2 brightness window. Its 3 px sample grid assigns each sample to the
nearest current site; exact ties favor the earliest site. An unweighted pass
averages owned sample positions. A darkness-weighted pass uses `1 - I` as the
weight. Zero-total-weight sites remain unchanged, and no 20 px border clamp
is applied. Each iteration uses the sites moved by the preceding pass.

The Ownership Strategy selector offers exactly three meaningful combinations:
Sampled (Unweighted), Sampled (Darkness-weighted), and Historical Cone
Rasterization (Darkness-weighted). The last is the original sketch's key-5
technique, not an execution backend for the 3 px sampled method. All three
start from the same seeded initialization.

The historical method reproduces the projected geometry of `cone()` using a
small CPU software rasterizer. Each site has a triangle-fan apex at `z = 1`
and 32 outer vertices at `z = -300`, radius `width + height`. The course
camera is orthographic. For each integer-indexed image pixel, the rasterizer
selects the angular triangle facet and interpolates its plane depth
`z = 1 - 301t`, with `t = 0` at the apex and `t = 1` at the polygon ring.
Higher depth wins; exact ties keep the earlier site. It skips a facet lookup
when a circular-cone lower bound proves that site cannot win. This does not
replace the polygonal cone with an exact Euclidean nearest-site diagram.

Each winning site writes its original base-64 RGB index color:
`r = i % 64`, `g = (i >> 6) % 64`, `b = (i >> 12) % 64`. The color is decoded
with `i = r + (g << 6) + (b << 12)` into an ownership raster. Background
`(127,127,127)` decodes outside the supported 18-bit ID range and is ignored.
The movement pass reads this **same** ownership map at every source pixel,
accumulating `x * (1 - I)`, `y * (1 - I)`, and `1 - I` per site. Debug shows the
actual encoded map and a separately recolored readable map from those IDs.
For multiple iterations, each new cone pass uses the sites moved by the
previous pass; the ownership debug view represents the input sites of the
last pass, before its movement.

After a positive-weight move, the historical site is clamped to
`[20, width - 20] x [20, height - 20]` when each dimension exceeds 40. For
dimensions of 40 or less, that axis safely falls back to `[0, dimension - 1]`.
The original `Point.voronoiMove()` divides by zero when a region has no dark
weight. This port intentionally leaves such a site unchanged to avoid NaN and
Infinity in later iterations. After at least one iteration, optional final
near-white filtering reuses the sampled method's strict `I < 0.95` test at
truncated final coordinates. Filtering does not affect movement or ownership.

The software cone result is deterministic, but not pixel-identical to P3D:
triangle edge inclusion, subpixel/antialiasing behavior, depth-buffer
precision, camera clipping, and exact pixel-center conventions may differ.
RGB index bytes are kept exact rather than passing through browser color
conversion; weighted sums use JavaScript floating-point accumulators rather
than Processing's `float` fields. The original acceleration relied on
graphics-hardware depth testing; this CPU port may be slower than the sampled reference on large
images. No WebGPU implementation is included.

The weighted mode can remove final sites in near-white pixels after one or
more iterations. Zero iterations always shows the complete initial set. The
test is strictly `I < 0.95` at truncated final coordinates;
the cutoff is rounded to Float32 like the stored Processing-brightness values.
Unweighted output is never filtered. The ownership debug view uses the final
sites on the same 3 px grid and expands each cell to full image resolution.
CPU/Worker recompute those owners with the reference rule; WebGPU performs a
final GPU ownership pass and reads it back only when debug is enabled. It is
not cone-rendered.

The interactive defaults are 250 initial sites, 5,000 initialization attempts,
3 iterations, weighted mode, and 4 px visible dots (matching the original
Voronoi renderer's `2 * pointRadius`). The original 10,000-site count would be
too costly with naive nearest-site scans on a large uploaded image. Zero
iterations shows the seeded initial sites without relaxation. If initialization
accepts no sites, the web result is an empty white image rather than an error.

## Algorithm strategy and execution backend

The strategy selects the mathematics; the backend selects where it runs.

| Strategy | CPU | Worker | WebGPU |
| --- | --- | --- | --- |
| Random Placement | Yes | No | No |
| Poisson Exact Distance | Yes | Yes | No |
| Poisson Historical Occupancy Buffer | Yes | No | No |
| Lloyd Sampled Unweighted | Yes | Yes | Yes |
| Lloyd Sampled Darkness-weighted | Yes | Yes | Yes |
| Lloyd Historical Cone Weighted | Yes | No | No |

`worker/entry.ts` receives typed requests from `worker/client.ts`. CPU and
Worker call the same `algorithm.cpu.ts` functions; there is no second implementation
of the mathematics. The main thread derives a new Float32 brightness buffer
and transfers that buffer, leaving the original `ImageData` intact for preview,
reruns, and debug. The Worker returns point coordinates and statistics; it
returns the brightness buffer only when debug is enabled. Sampled Lloyd
computes its expensive ownership debug
raster in the Worker when debug is enabled. Canvas and React remain on the main
thread. The client reuses one Worker, terminates it on cancellation/error or
when the experiment page unmounts, and starts a fresh one for a later run.

The UI's Processing time is the complete backend `run` call, including source
brightness conversion, messaging, algorithm computation, and result/debug
assembly, but not backend availability checking or Canvas rendering. Stage
timings distinguish Worker algorithm time from transfer/scheduling and main
thread work. A Worker does not make the algorithm inherently faster: its main
benefit is keeping the UI responsive. If Worker execution fails, the generic
runner reports the reason and falls back to the same method's CPU backend;
an intentional cancellation does not trigger fallback.

## Sampled Lloyd WebGPU ownership prototype (Phase 4C)

`methods/lloyd/ownership.webgpu.ts` is an internal diagnostic function, **not**
a registered execution backend. It computes only the nearest-site owner for
each 3 px sample. It does not perform centroid sums, move sites, run Lloyd
iterations, filter points, or produce a public `PointResult`. The Phase 4D
backend below reuses its shader and cached ownership pipeline.

`computeSampledOwnershipWebGpu(points, width, height)` accepts finite site
coordinates and positive integer image dimensions. The grid has
`ceil(width / 3)` columns and `ceil(height / 3)` rows. For linear index `i`,
the sample is `(3 * (i % columns), 3 * floor(i / columns))`; this includes the
last valid sample when dimensions are not multiples of 3. One invocation
handles one sample, with 128 invocations per workgroup. The point buffer stores
packed `vec2<f32>` positions. The output stores one `u32` site index per
sample, in row-major order. An empty point set yields `0xffffffff` (`NO_OWNER`)
at every sample. The shader checks sites in index order and updates the owner
only on strict `<`, so exact ties favor the earliest index.

The CPU comparison helper uses the original `nearestSiteIndex` and JavaScript
Number coordinates; the actual CPU Lloyd algorithm was not changed. GPU
coordinates and squared-distance arithmetic use `f32`. For example, at sample
`(3, 0)` with sites `(3.00000001, 0)` and `(3, 0)`, CPU distances are about
`1e-16` and `0`, so CPU picks site 1. Both uploaded x-coordinates round to
`3` in `f32`, so GPU sees a tie and picks site 0. Small differences near
Voronoi boundaries can therefore be expected without changing CPU precision.

The isolated development benchmark is at
`/dev/stippling-ownership.html?case=small` (also `medium`, `realistic`, and
`heavier`) while Vite is running. It uses deterministic sites from the same
Lloyd initialization, compares all ownership indices with CPU, repeats the
GPU pass, and exercises controlled exact-parity and `f32`-boundary cases.
This page is not a production route. Timing separates device acquisition,
shader/pipeline creation, buffer setup, site packing, `queue.writeBuffer`
enqueue, compute submission, GPU completion wait, and readback. Upload enqueue
time is **not** the full GPU transfer time: the completion wait includes
queued uploads and compute work. The prototype deliberately uses a second
submission for copy/readback so its cost is visible, at the expense of an
extra synchronization. Its per-device shader pipeline is cached locally for
warm-run comparisons; device loss is handled by the shared WebGPU device
manager. This timing is not a full Lloyd or production backend measurement.

## Complete Sampled Lloyd WebGPU backend (Phase 4D)

`backend.webgpu.ts` keeps brightness conversion, the exact seeded CPU
initialization, and the final `keepBelowWhiteCutoff` filter on CPU. It uploads
the initial ordered sites, then `algorithm.webgpu.ts` runs each iteration as:

1. Existing `ownership.wgsl`: one invocation per 3 px sample, scan sites in
   index order with strict `<`, write a `u32` owner.
2. `partial.wgsl`: one 128-thread workgroup per `(site, 256-sample tile)`.
   Each lane checks two fixed sample indices, contributes either `(x, y, 1)`
   or `(w*x, w*y, w)` with `w = 1 - Processing brightness`, then uses a fixed
   workgroup reduction tree. Unweighted mode does not read brightness here.
3. `centroid.wgsl`: one 128-thread workgroup per site reads that site's tiles
   in ascending, strided order, reduces them through a fixed tree, and writes
   the centroid to the *other* site buffer. A zero-weight site is copied
   unchanged. No 20 px historical clamp is applied.

The site buffers alternate A -> B -> A without coordinate copies between
iterations. Each compute pass is ordered before the next pass in one WebGPU
command buffer; a workgroup barrier is used only inside each fixed reduction
tree, never as a cross-workgroup synchronization device. There are no
floating-point atomics or fixed-point integer sums. Addition order is stable
for identical inputs on one implementation, but is not the CPU's serial
Float64-style order. GPU sites, ownership, and partials remain on GPU during
all iterations. Normal execution copies back only final site coordinates and
then builds the existing `PointResult` with the generic Canvas renderer.

For 1536 x 1024, 500 sites, step 3: 175,104 samples and 684 tiles. Approximate
GPU buffer sizes (excluding driver allocation overhead) are:

| Buffer | Bytes |
| --- | ---: |
| Two `vec2<f32>` site buffers | 8,000 |
| `u32` ownership | 700,416 |
| 684 x 500 `vec4<f32>` partial sums | 5,472,000 |
| Weighted Float32 brightness (unweighted: 4-byte dummy) | 6,291,456 |
| Final site staging + uniform config | 4,032 |

Total is about 11.9 MiB weighted or 5.9 MiB unweighted. Debug additionally
uses about 0.67 MiB for final ownership staging and 4 KiB for pre-final
sites. This avoids a `samples x sites x vec3` allocation. Ownership uses 128
threads/workgroup, partial accumulation 128 threads for 256 samples, and
centroid update 128 threads/site. These are conservative defaults, not an
exhaustive tuning result.

Zero iterations return the initialized sites without movement dispatches.
Debug with zero iterations runs only final ownership; zero accepted sites
produce the documented no-owner sentinel without a reduction. With debug
enabled after positive iterations, a copy captures sites entering the last
iteration, then a *final* ownership pass runs on sites after the last centroid
update. That ownership is read once for the existing debug visualization;
normal execution never reads it back. Filtering still occurs after movement
and does not affect ownership.

The per-device shader pipelines are cached; the shared device layer handles
loss/reacquisition. If the public WebGPU backend is unavailable or fails,
the generic runner falls back to **the same Sampled Lloyd CPU strategy**.
Worker remains an independent option for running the reference CPU algorithm
off the main thread. The browser comparison uses ordered point counts and
coordinate displacement, not raster pixel comparison. `f32` arithmetic can
shift a final site or change an ownership decision near a boundary; results
are not claimed to be bit-identical. Cold device setup and small workloads
can make CPU faster.

`/dev/stippling-lloyd.html?case=small&mode=weighted` is the development-only
complete-backend benchmark. Cases are `small`, `medium`, `realistic`, and
`heavier`; modes are `weighted` and `unweighted`. `case=controls` runs
synthetic mathematical checks. CPU, Worker, cold WebGPU, warm WebGPU, and
debug WebGPU use the same source image, seed, attempts, iterations, filter,
and dot size. Stage timings separately report CPU brightness and initialization,
upload enqueue, command encoding, *combined* GPU completion, final site
readback, and optional debug readback. Encoding/submission is not mislabeled
as GPU compute time; per-pass GPU timing would require timestamp queries.
