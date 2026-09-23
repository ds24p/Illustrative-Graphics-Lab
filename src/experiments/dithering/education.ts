import type {
  MethodEducationalContent,
  MethodEducationalContentDefinition,
} from "../../core/experiments/types";

const processingBrightnessMath = {
  label: "Processing-style brightness",
  expressions: ["I = max(R, G, B) / 255"],
  explanation:
    "This is the HSB/HSV value component used by the original Processing work. It is not luminance and does not weight channels by human visual sensitivity.",
};

const floydSteinbergStencil = {
  label: "Error distribution",
  expressions: ["             X     7/16\n          3/16   5/16   1/16", "7/16 + 3/16 + 5/16 + 1/16 = 1"],
  explanation:
    "X is the current pixel. Only neighbors that have not yet been processed receive error.",
};

const paletteDistanceMath = {
  label: "Nearest palette color",
  expressions: [
    "d^2(c, p) = (Rc - Rp)^2 + (Gc - Gp)^2 + (Bc - Bp)^2",
    "p* = argmin_p d^2(c, p)",
  ],
  explanation:
    "Taking a square root would preserve the ordering of distances, so the implementation compares squared distances and avoids that extra work. Exact ties select the first palette entry.",
};

const thresholdEducation: MethodEducationalContent = {
  summary:
    "Converts each source pixel to one scalar brightness and makes a direct black-or-white decision. It creates a hard tonal boundary without spatial error compensation.",
  steps: [
    "Read the source pixel's red, green, and blue channels.",
    "Convert them to Processing-style brightness using the largest RGB channel.",
    "Compare the normalized brightness with the selected threshold.",
    "Write white when brightness is greater than or equal to the threshold; otherwise write black.",
  ],
  mathematics: [
    processingBrightnessMath,
    {
      label: "Binary decision",
      expressions: ["q = 1 (white) if I >= T; otherwise q = 0 (black)"],
    },
  ],
  parameters: [
    {
      name: "Threshold",
      description:
        "Moves the black/white boundary. Raising it requires a brighter source value to produce white, so more pixels become black.",
    },
  ],
  characteristics: [
    "Deterministic: the same image and threshold always produce the same result.",
    "Pixel-independent: one decision never changes another pixel.",
    "Binary raster output with no propagated quantization error.",
  ],
  computation: {
    cpu: "A single linear pass performs constant work per pixel.",
    gpu: "A good WebGPU candidate because every invocation reads and writes one independent pixel. This project includes a matching WebGPU backend.",
  },
};

const randomThresholdEducation: MethodEducationalContent = {
  summary:
    "Perturbs the threshold separately at every pixel, replacing a hard boundary with a reproducible noise pattern whose local density represents tone.",
  steps: [
    "Convert RGB to Processing-style brightness.",
    "Hash the pixel coordinates together with the seed to obtain a reproducible value h in [0, 1).",
    "Map h to an offset in [-amplitude, +amplitude] and add it to the base threshold.",
    "Compare brightness with that local threshold and write black or white.",
  ],
  mathematics: [
    processingBrightnessMath,
    {
      label: "Perturbed threshold",
      expressions: [
        "T(x, y) = Tbase + A(2h(x, y, seed) - 1)",
        "q = 1 (white) if I >= T(x, y); otherwise q = 0",
        "P(white | I) = clamp((I - (Tbase - A)) / (2A), 0, 1), for A > 0",
      ],
      explanation:
        "The probability expression assumes the hash values are uniformly distributed. Brighter intensities are therefore more likely to become white. At A = 0 the method reduces to fixed thresholding.",
    },
  ],
  parameters: [
    {
      name: "Threshold",
      description: "Sets the center of the per-pixel threshold range.",
    },
    {
      name: "Random threshold amplitude",
      description:
        "Controls the half-width of the threshold range. Larger values introduce variation across a wider range of source intensities.",
    },
    {
      name: "Random seed",
      description:
        "Changes the spatial noise pattern. Reusing a seed reproduces exactly the same thresholds on CPU and WebGPU.",
    },
  ],
  characteristics: [
    "Stochastic-looking but deterministic for a fixed seed.",
    "The original Processing sketch used Processing random(); the web version uses a coordinate-and-seed hash for reproducibility and CPU/WebGPU agreement.",
    "Pixel-independent: no quantization error is propagated to neighbors.",
  ],
  computation: {
    cpu: "A linear pass hashes coordinates and thresholds each pixel independently.",
    gpu: "Straightforward to parallelize because the hash, threshold, and output depend only on the current pixel and parameters. A WebGPU backend is implemented.",
  },
};

const floydSteinberg1DEducation: MethodEducationalContent = {
  summary:
    "Quantizes brightness to black or white and transfers the complete quantization error to the next pixel in the same row. This lets neighboring pixels collectively represent intermediate intensity.",
  steps: [
    "Create a floating-point working copy of the source intensity image.",
    "Scan each row from left to right, with rows visited from top to bottom.",
    "Quantize the current adjusted value to white when it is at least 0.5, otherwise to black.",
    "Subtract the quantized value from the adjusted value.",
    "Add the complete error to the next pixel in the row. Error at the right edge is discarded.",
  ],
  mathematics: [
    processingBrightnessMath,
    {
      label: "One-dimensional error diffusion",
      expressions: [
        "a(x, y) = source(x, y) + incoming error",
        "q = 1 if a >= 0.5; otherwise q = 0",
        "e = a - q",
        "working(x + 1, y) = working(x + 1, y) + e",
      ],
      explanation:
        "The working values are not clamped, so signed error is preserved for the next decision.",
    },
  ],
  characteristics: [
    "Deterministic binary error diffusion.",
    "Sequential within each row because a pixel consumes error from its left neighbor.",
    "Rows are independent in this implementation; error does not wrap to the next row.",
  ],
  computation: {
    cpu: "A linear raster pass with one floating-point dependency along each row.",
    gpu: "Not a straightforward one-invocation-per-pixel shader because adjacent pixels in a row depend on earlier results. Row-level parallel strategies are possible but are not implemented.",
  },
};

const floydSteinberg2DEducation: MethodEducationalContent = {
  summary:
    "Uses classic two-dimensional Floyd-Steinberg error diffusion to turn scalar intensity into a binary pattern whose spatial average approximates gray tones.",
  steps: [
    "Copy source intensities into an unclamped floating-point working buffer.",
    "Scan left to right and top to bottom.",
    "Quantize the current adjusted intensity using the original sketch's strict threshold: values greater than 0.5 become white; exactly 0.5 becomes black.",
    "Calculate the signed quantization error.",
    "Distribute that error to the right, lower-left, lower, and lower-right unprocessed pixels using Floyd-Steinberg weights.",
  ],
  mathematics: [
    processingBrightnessMath,
    {
      label: "Quantization error",
      expressions: [
        "a(x, y) = source(x, y) + accumulated incoming error",
        "q = 1 if a > 0.5; otherwise q = 0",
        "e = a - q",
      ],
      explanation:
        "The strict > comparison is intentionally preserved from the Processing implementation and differs from this project's Threshold, 1D, and Lines methods, which use >=.",
    },
    floydSteinbergStencil,
  ],
  characteristics: [
    "Deterministic, raster-order, two-dimensional error diffusion.",
    "The weights sum to one, so all error is assigned when all four neighbors exist; edge pixels naturally lose the portions whose neighbors fall outside the image.",
    "Working intensities are not clamped, preserving signed accumulated error.",
  ],
  computation: {
    cpu: "A linear pass is efficient on the CPU, where the scan-order dependency is easy to express.",
    gpu: "Classic raster-order Floyd-Steinberg is a poor fit for direct WebGPU parallelism because each decision changes values needed by later invocations.",
  },
};

const floydSteinbergLinesEducation: MethodEducationalContent = {
  title: "Floyd-Steinberg 2D with Lines",
  summary:
    "This Processing-derived custom variant combines Floyd-Steinberg-style error propagation with diagonal marks. A black decision emits a line toward the upper-left instead of one isolated black pixel.",
  steps: [
    "Scan the image left to right and top to bottom using an unclamped intensity working buffer.",
    "Quantize the adjusted value with >= 0.5 as the white decision.",
    "For a black decision at (x, y), draw the seed and earlier diagonal positions (x-1, y-1), (x-2, y-2), and so on.",
    "Draw backward into already visited output positions so the mark does not pre-paint future pixels that still need their own quantization and error-propagation decisions.",
    "Use the custom full-line compensation, then diffuse that error with the usual 7/16, 3/16, 5/16, 1/16 weights.",
  ],
  mathematics: [
    {
      label: "Backward line",
      expressions: ["(x, y)\n  ^ upper-left\n(x-1, y-1)\n  ^ upper-left\n(x-2, y-2)"],
    },
    {
      label: "Custom black-line compensation",
      expressions: ["error = adjusted source[x][y] + (m - 1)"],
      explanation:
        "m is the requested line length. This is preserved behavior from the original Processing assignment, not a universal Floyd-Steinberg equation.",
    },
    floydSteinbergStencil,
  ],
  parameters: [
    {
      name: "Line length",
      description:
        "Sets the requested number of black pixels in each upper-left diagonal mark. The default is 3; the UI allows 1 through 32.",
    },
  ],
  characteristics: [
    "Custom line-based binary rendering rather than standard one-pixel Floyd-Steinberg output.",
    "At top and left boundaries the visible line is clipped, but compensation still assumes the complete requested length.",
    "Overlapping lines may rewrite already-black pixels, yet the full compensation is still applied. Both behaviors intentionally match the Processing sketch.",
  ],
  computation: {
    cpu: "Raster-order error diffusion is combined with a short backward line-writing loop for each black decision.",
    gpu: "A poor direct WebGPU candidate: future intensity decisions are sequential, and line writes can overlap earlier output pixels, requiring additional coordination.",
  },
};

const rgbLevelsEducation: MethodEducationalContent = {
  summary:
    "Reduces each RGB channel independently to a regular set of levels. This is color quantization: it limits available colors but does not create a spatial dithering pattern.",
  steps: [
    "Normalize each red, green, and blue byte to the range [0, 1].",
    "Scale each channel by L - 1 and round to the nearest level index.",
    "Convert the selected indices back to evenly spaced channel bytes.",
    "Preserve the source alpha channel.",
  ],
  mathematics: [
    {
      label: "Independent channel quantization",
      expressions: [
        "q(c) = round(c * (L - 1)) / (L - 1), for normalized c",
        "L levels per channel -> up to L^3 RGB colors",
        "L = 2 -> 2^3 = 8 possible RGB colors",
      ],
    },
  ],
  parameters: [
    {
      name: "Levels per channel",
      description:
        "Controls the number L of evenly spaced values available independently to red, green, and blue. The current UI allows 2 through 8, so this is not the same as choosing L total colors.",
    },
  ],
  characteristics: [
    "Deterministic regular-RGB-cube quantization.",
    "No spatial error propagation and therefore no dithering by itself.",
    "Every pixel and every color channel can be processed independently.",
  ],
  computation: {
    cpu: "A constant amount of arithmetic is performed for each pixel.",
    gpu: "An excellent WebGPU candidate because there are no neighbor dependencies. This project includes a matching compute shader.",
  },
};

const rgbOrderedEducation: MethodEducationalContent = {
  summary:
    "Combines the same regular RGB levels with a repeating Bayer threshold. Nearby pixels choose different adjacent levels, so their spatial mixture can suggest colors between the available levels.",
  steps: [
    "Scale each normalized RGB channel to the range of level indices.",
    "Separate the lower integer level from the fractional remainder.",
    "Look up a normalized threshold from the repeating Bayer rank matrix at the pixel coordinates.",
    "Choose the upper adjacent level only when the channel fraction is greater than the Bayer threshold.",
    "Convert the selected level index back to a channel byte and preserve alpha.",
  ],
  mathematics: [
    {
      label: "Bayer ranks and threshold",
      expressions: [
        "B2 ranks = [ 0  2 ]\n           [ 3  1 ]",
        "b(x, y) = (rank(x mod N, y mod N) + 0.5) / N^2",
      ],
      explanation:
        "The implementation contains fixed rank matrices for N = 2, 4, and 8. Adding 0.5 places every normalized threshold strictly between zero and one.",
    },
    {
      label: "Choice between adjacent levels",
      expressions: [
        "s = c * (L - 1)",
        "lower = floor(s), fraction = s - lower",
        "level = min(lower + [fraction > b(x, y)], L - 1)",
      ],
    },
  ],
  parameters: [
    {
      name: "Levels per channel",
      description:
        "Defines the regular set of channel values. The output still uses only combinations from these L levels per channel.",
    },
    {
      name: "Bayer matrix size",
      description:
        "Selects a 2 x 2, 4 x 4, or 8 x 8 repeating threshold pattern. Larger matrices distribute more threshold ranks over a larger tile.",
    },
  ],
  characteristics: [
    "Deterministic ordered dithering with a visible periodic structure.",
    "No propagated error: the Bayer pattern changes local decisions without changing neighboring working values.",
    "The same Bayer threshold is evaluated independently for each RGB channel.",
  ],
  computation: {
    cpu: "A linear pass performs a matrix lookup and fixed arithmetic for each channel.",
    gpu: "A strong WebGPU candidate because a pixel depends only on its source channels, coordinates, and parameters. The shader uses integer cross-multiplication to match CPU decisions exactly.",
  },
};

const fixedPaletteEducation: MethodEducationalContentDefinition = {
  variants: [
    {
      when: { parameter: "paletteDitheringStrategy", equals: "none" },
      content: {
        title: "Fixed Palette Quantization",
        summary:
          "Maps every source RGB color directly to the nearest member of an explicit palette. With no diffusion selected, this is palette quantization rather than spatial dithering.",
        steps: [
          "Resolve the selected built-in or custom palette in its declared order.",
          "For each source pixel, calculate squared RGB distance to every palette entry.",
          "Choose the entry with the smallest distance and write that exact palette color.",
          "Preserve source alpha; no error is passed to neighboring pixels.",
        ],
        mathematics: [
          paletteDistanceMath,
          {
            label: "Two different meanings of color count",
            expressions: [
              "RGB Levels: L levels per channel -> up to L^3 colors",
              "Fixed Palette: palette size N -> N explicitly listed colors",
            ],
          },
        ],
        parameters: [
          {
            name: "Palette",
            description:
              "Selects the arbitrary set of allowed output colors. A custom palette can add, edit, remove, and reorder that set.",
          },
          {
            name: "Dithering strategy",
            description:
              "None performs only nearest-color mapping. Selecting Floyd-Steinberg changes this educational view and enables RGB vector error diffusion.",
          },
        ],
        characteristics: [
          "Deterministic, palette-based color quantization.",
          "Pixel-independent with local reconstruction error only.",
          "Every output RGB value is one of the selected palette entries.",
        ],
        computation: {
          cpu: "Each pixel searches all palette entries, giving work proportional to pixel count times palette size.",
          gpu: "The direct nearest-color search is parallel per pixel and is a good potential WebGPU task for small palettes, although this method currently has only a CPU backend.",
        },
      },
    },
    {
      when: {
        parameter: "paletteDitheringStrategy",
        equals: "floyd-steinberg",
      },
      content: {
        title: "Fixed Palette + Floyd-Steinberg",
        summary:
          "Chooses one nearest palette color for the current RGB vector, then distributes the resulting three-component error. Colored dots and streaks can spatially approximate colors absent from the palette.",
        steps: [
          "Copy source RGB values into an unclamped floating-point working buffer.",
          "Scan left to right and top to bottom.",
          "Find one nearest palette color for the current adjusted RGB vector.",
          "Write that palette color and compute red, green, and blue error components.",
          "Apply the Floyd-Steinberg weights independently to all three components and add them to future working pixels.",
        ],
        mathematics: [
          paletteDistanceMath,
          {
            label: "RGB vector error",
            expressions: ["e = (aR - pR,\n     aG - pG,\n     aB - pB)"],
            explanation:
              "The nearest-color decision is made once for the complete RGB vector. This is not three independent binary Floyd-Steinberg algorithms.",
          },
          floydSteinbergStencil,
        ],
        parameters: [
          {
            name: "Palette",
            description:
              "Defines the only RGB colors that may appear in the final output. Palette order also resolves exact distance ties.",
          },
          {
            name: "Dithering strategy",
            description:
              "Floyd-Steinberg enables raster-order RGB vector diffusion; switching to None returns to independent nearest-color mapping.",
          },
        ],
        characteristics: [
          "Sequential palette-based color error diffusion.",
          "Working RGB values remain unclamped so negative and above-255 propagated values retain their signed error.",
          "Every final output pixel is still exactly one palette color; new apparent colors arise only from spatial averaging.",
        ],
        computation: {
          cpu: "The CPU performs a palette search and updates four future neighbors for each pixel.",
          gpu: "Classic raster-order dependencies prevent straightforward per-pixel WebGPU parallelism, so this strategy intentionally remains CPU-only.",
        },
      },
    },
  ],
};

function createMedianCutEducation(
  strategy: "none" | "floyd-steinberg",
): MethodEducationalContent {
  const usesDiffusion = strategy === "floyd-steinberg";

  return {
    title: usesDiffusion
      ? "Median Cut Palette + Floyd-Steinberg"
      : "Generated Palette - Median Cut",
    summary: usesDiffusion
      ? "First generates a source-specific palette with deterministic Median Cut, then applies RGB vector Floyd-Steinberg diffusion using that palette. Palette generation and dithering are separate stages."
      : "Generates a limited source-specific palette with deterministic Median Cut, then maps every pixel independently to its nearest generated color. Palette generation and quantization are separate stages.",
    steps: [
      "Sample at most 65,536 non-transparent source pixels using a deterministic uniform stride.",
      "Begin with one color box containing all sampled colors.",
      "Choose the splittable box with the largest RGB channel range; ties prefer more samples, then the existing box order.",
      "Choose that box's largest-range channel, with red, then green, then blue as the tie order.",
      "Sort by the chosen channel, then RGB for deterministic ties, and split at floor(sample count / 2).",
      "Repeat until K boxes are reached or no box has remaining color variation.",
      "Represent each box by its rounded mean RGB color.",
      usesDiffusion
        ? "Use the generated palette for nearest-color decisions and diffuse the unclamped RGB vector error with Floyd-Steinberg weights."
        : "Use the generated palette for independent nearest-color mapping without error diffusion.",
    ],
    mathematics: [
      {
        label: "Palette size",
        expressions: [
          "Palette size K -> up to K representative colors",
          "RGB Levels L -> up to L^3 regular RGB combinations",
          "representative(box) = round(mean RGB of its sampled colors)",
        ],
        explanation:
          "K is a target. The implementation may return fewer colors when the sampled image has insufficient variation instead of inventing duplicate entries.",
      },
      paletteDistanceMath,
      ...(usesDiffusion
        ? [
            {
              label: "Palette application with diffusion",
              expressions: ["e = adjusted RGB - selected palette RGB"],
              explanation:
                "The 7/16, 3/16, 5/16, and 1/16 weights are applied to each component of this vector.",
            },
          ]
        : []),
    ],
    parameters: [
      {
        name: "Palette size",
        description:
          "Requests K representative colors, currently from 2 to 32. It changes palette generation, not levels independently available to each RGB channel.",
      },
      {
        name: "Dithering strategy",
        description: usesDiffusion
          ? "Floyd-Steinberg applies sequential RGB error diffusion after the palette has been generated."
          : "None applies the generated palette through direct nearest-color mapping only.",
      },
    ],
    characteristics: [
      "Deterministic source-adaptive palette generation.",
      "Fully transparent pixels are ignored while generating the palette.",
      usesDiffusion
        ? "Palette application is sequential because quantization error changes future pixels."
        : "After generation, palette application is pixel-independent and contains no spatial dithering.",
    ],
    computation: {
      cpu: usesDiffusion
        ? "Median Cut repeatedly analyzes, sorts, and partitions shared color sets; the following raster-order diffusion is also sequential. Both stages run on the CPU."
        : "Median Cut repeatedly analyzes, sorts, and partitions shared color sets on the CPU. The later nearest-color pass is independent per pixel.",
      gpu: usesDiffusion
        ? "Both Median Cut's global partitioning and Floyd-Steinberg's scan dependency are non-trivial GPU workloads, so the current implementation remains CPU-only."
        : "Median Cut generation is not a simple per-pixel compute shader and remains CPU-side. Applying the completed palette could be GPU-parallel, but no WebGPU backend is implemented here.",
    },
  };
}

const medianCutEducation: MethodEducationalContentDefinition = {
  variants: [
    {
      when: { parameter: "paletteDitheringStrategy", equals: "none" },
      content: createMedianCutEducation("none"),
    },
    {
      when: {
        parameter: "paletteDitheringStrategy",
        equals: "floyd-steinberg",
      },
      content: createMedianCutEducation("floyd-steinberg"),
    },
  ],
};

export const ditheringEducation = {
  threshold: thresholdEducation,
  "random-threshold": randomThresholdEducation,
  "floyd-steinberg-1d": floydSteinberg1DEducation,
  "floyd-steinberg-2d": floydSteinberg2DEducation,
  "floyd-steinberg-lines": floydSteinbergLinesEducation,
  "rgb-levels": rgbLevelsEducation,
  "rgb-levels-ordered": rgbOrderedEducation,
  "fixed-palette": fixedPaletteEducation,
  "median-cut": medianCutEducation,
} satisfies Record<string, MethodEducationalContentDefinition>;
