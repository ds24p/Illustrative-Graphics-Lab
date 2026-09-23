import type { MethodEducationalContent } from "../../core/experiments/types";

export const imageKernelEducation: MethodEducationalContent = {
  title: "Image-Kernel Screening",
  summary:
    "A repeating grayscale image supplies a local threshold for every source pixel. The method converts Processing-style brightness to black or white without convolution or error diffusion.",
  steps: [
    "Decode the selected built-in or uploaded kernel image and resize it to the requested kernel width and height.",
    "Composite kernel transparency over white, then convert the resized RGB pixels with Processing brightness: max(R, G, B) / 255.",
    "Convert the source image to the same normalized Processing brightness representation.",
    "For each source coordinate, look up the kernel value at its modulo-mapped coordinate so the finite kernel repeats.",
    "Invert that kernel value to form a local threshold, then emit black when source brightness is strictly below it and white otherwise.",
  ],
  mathematics: [
    {
      label: "Source intensity",
      expressions: ["S(x, y) = max(R, G, B) / 255"],
      explanation:
        "This preserves Processing brightness semantics. It is the HSB value component, not perceptual luminance.",
    },
    {
      label: "Tiling through modulo",
      expressions: ["Kxy = K(x mod kw, y mod kh)"],
      explanation:
        "The remainders always fall inside the finite kernel. When x or y passes an edge, the corresponding coordinate returns to zero, repeating the image over the source.",
    },
    {
      label: "Threshold inversion",
      expressions: ["T(x, y) = 1 - Kxy"],
      explanation:
        "Bright kernel regions have high K and therefore low thresholds, so more source pixels become white. Dark kernel regions have low K and high thresholds, so they favor black.",
    },
    {
      label: "Binary decision",
      expressions: [
        "O(x, y) = 0 if S(x, y) < T(x, y)",
        "O(x, y) = 1 otherwise",
      ],
      explanation:
        "The comparison is strict, matching the Processing sketch. Exact equality therefore produces white.",
    },
  ],
  parameters: [
    {
      name: "Kernel source",
      description:
        "Chooses between course assets and an uploaded PNG, JPEG, or WebP. Both choices enter the same normalization pipeline.",
    },
    {
      name: "Kernel",
      description:
        "Selects a distinct course kernel pattern. The default uses a higher-resolution source of the gradient design from the reference exercise.",
    },
    {
      name: "Kernel width / height",
      description:
        "Sets the numeric size used by the algorithm after resizing. Separate dimensions allow rectangular repeating kernels; 16 x 16 reproduces the reference default.",
    },
  ],
  characteristics: [
    "The kernel is a periodic threshold field, not a convolution kernel: it never computes a weighted sum of neighboring source pixels.",
    "There is no error diffusion. A pixel depends only on its own source intensity and one modulo-mapped kernel value.",
    "The normalized-kernel debug view is magnified with nearest-cell replication so its actual numeric cells remain visible.",
    "Uploaded transparency is composited over white as an explicit web-application rule; the Processing exercise did not define robust alpha behavior for arbitrary custom kernels.",
  ],
  computation: {
    cpu: "Kernel preparation is performed once. The screening pass is linear in the number of source pixels and uses constant work per pixel.",
    gpu: "The WebGPU backend assigns one invocation to each output pixel. It independently reads one source pixel and one exactly indexed value from the normalized kernel storage buffer, then performs the same inverted-threshold comparison as CPU.",
  },
};

const provenanceNote =
  "The original Processing sketch effectively used a quarter-image rotation pivot in the final renderer and left Cross disconnected from that renderer. This web port corrects those integration issues while preserving both procedural kernel equations.";

const sharedProceduralParameters = [
  {
    name: "Screen angle",
    description:
      "Rotates sampling coordinates around the actual image center. Degrees are converted to radians internally; the source image itself is not rotated.",
  },
  {
    name: "Cell width / height",
    description:
      "Sets the repeating modulo cell in pixels. Defaults are floor(source dimension / 16), with a defensive minimum of one pixel.",
  },
  {
    name: "Sine displacement",
    description:
      "When enabled, amplitude is measured in normalized cell widths, frequency is cycles over t, and phase is entered in degrees. The numeric controls are intentionally not given artificial bounds.",
  },
];

export const doubleSidedRampEducation: MethodEducationalContent = {
  title: "Procedural - Double-Sided Ramp",
  summary:
    "Creates a periodic threshold field from a mathematical function instead of a stored image. The ramp varies only along local coordinate s, producing stripe-like repetition before rotation or displacement.",
  steps: [
    "Convert the source to Processing brightness using max(R, G, B) / 255.",
    "Rotate each sampling coordinate around the actual center of the source image.",
    "Map the rotated point into one repeating cell with positive modulo and normalize it to (s, t).",
    "Optionally displace s with a sine wave and wrap it back into [0, 1).",
    "Evaluate the Double-Sided Ramp and use its value directly as the threshold.",
    "Emit black when source brightness is strictly below the threshold and white otherwise.",
  ],
  mathematics: [
    {
      label: "Double-Sided Ramp",
      expressions: [
        "K(s, t) = 2s,       if s <= 0.5",
        "K(s, t) = 2 - 2s,  if s > 0.5",
      ],
      explanation:
        "The equation has no dependence on t and no I parameter. Its value rises from zero to one, then falls toward zero across each cell.",
    },
    {
      label: "Rotation around the image center",
      expressions: [
        "dx = x - W/2;  dy = y - H/2",
        "xr = dx cos(theta) - dy sin(theta) + W/2",
        "yr = dx sin(theta) + dy cos(theta) + H/2",
      ],
      explanation:
        "Rotating coordinates changes screen orientation without rotating or resampling the source image.",
    },
    {
      label: "Positive modulo mapping",
      expressions: [
        "s = positiveModulo(xr, cellWidth) / cellWidth",
        "t = positiveModulo(yr, cellHeight) / cellHeight",
      ],
      explanation:
        "Modulo returns every image-space point to a local coordinate in the same cell, causing the procedural kernel to repeat.",
    },
    {
      label: "Optional sine displacement",
      expressions: [
        "d = amplitude * sin(frequency * 2pi * t + phase)",
        "s' = positiveFractionalWrap(s + d);  t' = t",
      ],
      explanation:
        "Changing s bends the periodic stripe field. Wrapping keeps the displaced coordinate inside the normalized cell.",
    },
    {
      label: "Direct procedural threshold",
      expressions: [
        "T(x, y) = K(s', t')",
        "O(x, y) = 0 if S(x, y) < T(x, y); otherwise 1",
      ],
      explanation:
        "Procedural screening uses K directly. The 1 - K inversion belongs only to Image-Kernel Screening.",
    },
  ],
  parameters: sharedProceduralParameters,
  characteristics: [
    "The Ramp kernel depends only on s, so Cell Height affects this method only when sine displacement uses t to modify s. Without sine displacement, changing Cell Height intentionally leaves the Ramp result unchanged.",
    "Exact threshold equality produces white, preserving the strict Processing comparison.",
    provenanceNote,
  ],
  computation: {
    cpu: "A linear pass performs constant coordinate arithmetic and one kernel evaluation per source pixel.",
    gpu: "The WebGPU backend evaluates rotation, positive modulo, optional sine displacement, the Ramp equation, and the threshold comparison independently for every output pixel.",
  },
};

export const crossEducation: MethodEducationalContent = {
  title: "Procedural - Cross",
  summary:
    "Uses the exact two-branch Cross kernel from the original course implementation. The historical name is retained, but the implemented equation is not presented as a perfectly symmetric geometric cross.",
  steps: [
    "Convert source RGB values to Processing brightness.",
    "Rotate the sampling coordinate around (W/2, H/2).",
    "Map it into normalized repeating coordinates (s, t) with positive modulo.",
    "Optionally apply the same sine displacement to s.",
    "Choose the Cross equation branch using I and use K(s, t, I) directly as the threshold.",
    "Emit black below the threshold and white at or above it.",
  ],
  mathematics: [
    {
      label: "Original Cross kernel",
      expressions: [
        "K(s, t, I) = I * t,                 if s <= I",
        "K(s, t, I) = (1 - I) * s + I,      if s > I",
      ],
      explanation:
        "The left branch varies with t and is scaled by I. The right branch varies with s, begins above the branch boundary, and approaches one as s approaches one.",
    },
    {
      label: "Role of I",
      expressions: ["0 <= I <= 1", "s = I uses the first branch"],
      explanation:
        "I simultaneously controls the branch boundary and both branch coefficients. The web UI constrains it to the intended domain; the Processing sketch itself did not clamp it.",
    },
    {
      label: "Coordinate pipeline",
      expressions: [
        "(x, y) -> center rotation -> positive modulo -> (s, t)",
        "(s, t) -> optional sine displacement -> K(s, t, I)",
      ],
      explanation:
        "Rotation changes orientation, modulo repeats the cell, and sine displacement modifies only s before the kernel is evaluated.",
    },
    {
      label: "Direct threshold decision",
      expressions: [
        "T(x, y) = K(s', t', I)",
        "O(x, y) = 0 if S(x, y) < T(x, y); otherwise 1",
      ],
    },
  ],
  parameters: [
    {
      name: "I",
      description:
        "Controls the exact branch boundary and coefficients shown above. The original default is 0.5.",
    },
    ...sharedProceduralParameters,
  ],
  characteristics: [
    "This is the actual Processing kernel_cross function, not a replacement chosen to better match the method name.",
    "Exact threshold equality produces white.",
    provenanceNote,
  ],
  computation: {
    cpu: "The CPU performs a constant amount of coordinate and branch arithmetic independently for each pixel.",
    gpu: "Cross shares the procedural WebGPU coordinate pipeline with Ramp. Each invocation independently evaluates the original two-branch equation and threshold comparison.",
  },
};

export const textScreeningEducation: MethodEducationalContent = {
  title: "Text Screening",
  summary:
    "Represents each source cell with one rasterized letter glyph. At Text Scale 1 the cell and glyph are 8 x 14 pixels. Cell brightness chooses a glyph size/density level, while a deterministic seed chooses the letter A-Z within that level.",
  steps: [
    "Convert the source image to Processing brightness using max(R, G, B) / 255.",
    "Scale the original 8 x 14 atlas glyphs and divide the image into matching rectangular cells, including partial cells at the right and bottom edges.",
    "Reduce every cell to the mean intensity of only its valid source pixels.",
    "Quantize the average to one of eight intensity levels with round(avg * 7).",
    "Use seeded pseudo-randomness to choose one A-Z character within that already determined level.",
    "Copy the selected grayscale glyph raster at the effective cell size, clipping it at image boundaries.",
  ],
  mathematics: [
    {
      label: "Block average",
      expressions: [
        "avg = (sum of valid source intensities in the cell) / valid pixel count",
      ],
      explanation:
        "Many source pixels become one scalar value. Partial edge cells divide by their actual number of pixels, not by the full scaled cell area.",
    },
    {
      label: "Cell dimensions",
      expressions: [
        "cellWidth = max(1, round(8 * Text Scale))",
        "cellHeight = max(1, round(14 * Text Scale))",
      ],
      explanation:
        "The stable Processing atlas is resampled to these same dimensions before glyph copying. At scale 1 no resampling occurs.",
    },
    {
      label: "Intensity quantization",
      expressions: [
        "level = clamp(round(avg * (L - 1)), 0, L - 1)",
        "L = 8",
      ],
      explanation:
        "The mapping produces integer levels 0 through 7 exactly as in the Processing sketch.",
    },
    {
      label: "Character selection",
      expressions: [
        "characterIndex = seededRandom(cellX, cellY, seed) in [0, 26)",
        "glyph = atlas[level][characterIndex]",
      ],
      explanation:
        "The intensity level chooses glyph size/density. Randomness chooses only which letter A-Z appears within that level, so it cannot change block averages or levels.",
    },
  ],
  parameters: [
    {
      name: "Text Scale",
      description:
        "Changes cell and glyph dimensions together from 0.5x to 4x. The default 1x preserves the reference 8 x 14 raster exactly.",
    },
    {
      name: "Seed",
      description:
        "Controls deterministic character choices. Reusing the same image, parameters, and seed reproduces the same letters; changing only the seed leaves averages and levels unchanged.",
    },
    {
      name: "Fixed original atlas properties",
      description:
        "The source glyphs are 8 x 14 pixels, the atlas has 8 levels, and the character set is A-Z. Only the effective cell and glyph dimensions change with Text Scale.",
    },
  ],
  characteristics: [
    "The original polarity is intentionally preserved: higher source intensity selects higher atlas levels whose larger glyphs generally contain more black ink. Brighter regions can therefore render darker than conventional text halftoning would suggest.",
    "The atlas stores grayscale antialiasing from Processing, so the final RasterResult can contain gray edge pixels even though the conceptual marks are black letters on white.",
    "Non-default scales use deterministic bilinear interpolation of atlas grays, preserving antialiased edges without browser font rendering.",
    "The Processing version used unseeded random(). The web version deliberately uses seeded coordinate-based pseudo-randomness so results can be reproduced and compared.",
    "This is glyph-based cell reduction and raster copying, not a threshold-field method and not a general ASCII-art layout system.",
  ],
  computation: {
    cpu: "Cells are independent. After the atlas glyphs are resampled once for the selected scale, each cell averages its valid source pixels and copies one glyph. Total image work remains linear in the pixel count.",
    gpu: "Cell reductions and glyph copies could be parallelized, but their work grouping is less direct than the independent per-pixel threshold methods. This phase intentionally provides CPU only; a Web Worker would also fit without changing the core algorithm.",
  },
};

export const cmykClusteredDotEducation: MethodEducationalContent = {
  title: "CMYK Clustered-Dot Screening",
  summary:
    "Separates an RGB image into four idealized ink-coverage channels, screens each channel with its own rotated clustered-dot threshold field, and combines the four binary plates into an idealized subtractive preview.",
  steps: [
    "Composite source transparency over ideal white paper and normalize RGB channels to the range [0, 1].",
    "Convert every RGB color into continuous cyan, magenta, yellow, and black ink coverages, where zero means no ink and one means maximum ink.",
    "Build one square threshold cell by ranking its samples from the center outward; equal distances use a deterministic row-then-column order.",
    "Rotate the pixel-center coordinate independently for C, M, Y, and K, then use positive modulo and floor to look up one periodic threshold-cell sample.",
    "Activate each binary plate where its continuous ink coverage is greater than or equal to the corresponding threshold.",
    "Combine the four binary masks as ideal subtractive inks on white paper to form the final raster preview.",
  ],
  mathematics: [
    {
      label: "RGB to CMYK ink coverage",
      expressions: [
        "K = 1 - max(R, G, B)",
        "C = (1 - R - K) / (1 - K)",
        "M = (1 - G - K) / (1 - K)",
        "Y = (1 - B - K) / (1 - K)",
      ],
      explanation:
        "R, G, and B are normalized. For pure black, K = 1 and C = M = Y = 0 so the division by zero is avoided. In every CMYK channel, 0 means no ink and 1 means maximum ink.",
    },
    {
      label: "Clustered-dot threshold cell",
      expressions: [
        "dx = 2i + 1 - N;  dy = 2j + 1 - N",
        "score(i, j) = dx^2 + dy^2",
        "T(i, j) = (rank(i, j) + 0.5) / N^2",
      ],
      explanation:
        "Lower scores are nearer the cell center and receive earlier thresholds. As requested coverage rises, progressively more positions activate and the ink cluster grows outward. Ties are ranked by y, then x, so all thresholds remain unique and reproducible.",
    },
    {
      label: "Periodic screen sampling",
      expressions: [
        "pixel center = (x + 0.5, y + 0.5)",
        "cell coordinate = floor(positiveModulo(rotated position, N))",
      ],
      explanation:
        "Each channel rotates coordinates around the image center before periodic lookup. There is no interpolation between threshold-cell samples.",
    },
    {
      label: "Ink decision",
      expressions: ["ink = 1 if coverage >= T; otherwise 0"],
      explanation:
        "This is ink-coverage screening, not the brightness comparison used by the black-and-white methods. Coverage zero activates nothing and coverage one activates every threshold.",
    },
    {
      label: "Idealized subtractive preview",
      expressions: [
        "R = (1 - Cink)(1 - Kink)",
        "G = (1 - Mink)(1 - Kink)",
        "B = (1 - Yink)(1 - Kink)",
      ],
      explanation:
        "No masks produce white; individual C, M, and Y masks produce their ideal ink colors; overlapping C+M, C+Y, and M+Y produce blue, green, and red. Any active K mask produces black.",
    },
  ],
  parameters: [
    {
      name: "Screen cell size",
      description:
        "Sets one shared square period in pixels for all four channels. Larger cells create a coarser screen with larger visible dots; smaller cells create a finer screen. This is a digital pixel size, not physical LPI.",
    },
    {
      name: "Angle preset",
      description:
        "Classic CMYK uses C=15, M=75, Y=0, K=45 degrees. Aligned uses zero for every channel. Moir\u00e9 Demo moves cyan and magenta to 15 and 18 degrees to reveal larger interference. Custom exposes all four angle controls.",
    },
  ],
  characteristics: [
    "Different channel angles keep the four periodic screens from simply stacking on the same grid. Regularly spaced angles can form small repeating rosette structures when the plates overlap.",
    "Poorly chosen or very similar angles can produce larger visible interference bands called moir\u00e9. The Moir\u00e9 Demo preset makes this behavior deliberate and inspectable.",
    "Coverage and binary-mask debug views use the corresponding ink color on white, while threshold fields use grayscale. These are display mappings; the stored coverage, threshold, and mask values remain numeric.",
    "The result is an idealized subtractive preview, not a print proof. It uses no ICC profile, real ink spectra, dot gain, trapping, paper tint, or registration error.",
  ],
  computation: {
    cpu: "The threshold cell is constructed once, then each source pixel performs four independent rotated lookups and four coverage comparisons. Runtime is linear in the number of image pixels; large debug buffers are allocated only when intermediate views are requested.",
    gpu: "WebGPU shares the CPU-generated threshold cell as read-only data. Each invocation independently reads one source pixel, converts it to CMYK, samples four rotated screens, forms four masks, and writes one preview pixel.",
  },
};
