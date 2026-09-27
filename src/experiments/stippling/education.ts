import type { MethodEducationalContent } from "../../core/experiments/types";

export const placementEducation: MethodEducationalContent = {
  title: "Random Placement Stippling",
  summary:
    "Dark regions receive more randomly placed dots; bright regions receive fewer. Each accepted position becomes a black dot, with no minimum-distance rule.",
  executionSummary: "CPU only: candidate decisions consume an ordered random stream. A large attempt budget can pause the main thread.",
  collapseDetails: true,
  steps: [
    "Convert RGB pixels to Processing brightness and prepare a seeded random stream.",
    "Draw a floating-point candidate position and round it only for the local brightness lookup.",
    "Average brightness inside the clamped, exclusive-upper-bound neighborhood.",
    "Draw a new random value U and accept the position when U is greater than the average brightness.",
    "Stop at Target Points or Max Attempts, then render accepted positions as dots.",
  ],
  mathematics: [
    {
      label: "Processing brightness",
      expressions: ["I(x, y) = max(R, G, B) / 255"],
      explanation: "This is HSB/HSV value, not perceptual luminance.",
    },
    {
      label: "Local average",
      expressions: ["Iavg = sum of brightness in [x1, x2) x [y1, y2) / included pixel count"],
      explanation: "The rectangle is clipped at image borders; the decision is not necessarily based on one source pixel.",
    },
    {
      label: "Acceptance",
      expressions: ["U ~ Uniform[0, 1)", "accept if U > Iavg", "P(accept) = 1 - Iavg"],
      explanation: "At black, acceptance probability is 1; at 50% gray it is about 0.5; at white it is 0. The comparison is strictly greater than.",
    },
  ],
  parameters: [
    { name: "Seed", description: "Repeats the candidate and acceptance sequence for identical inputs and parameters." },
    { name: "Target Points / Max Attempts", description: "The first reached limit stops generation. Bright images can exhaust attempts before reaching the target without causing an error." },
    { name: "Intensity Window", description: "A value of 2 samples a 4 x 4 rectangle away from borders, as in the Processing sketch." },
    { name: "Dot Size", description: "Visible diameter only; changing it does not change which candidates are accepted. The Processing sketch drew 2 px dots; the 3 px web default keeps them legible when the sample is scaled to the page." },
  ],
  characteristics: [
    "This is rejection sampling: candidate positions are independent and dots may overlap.",
    "The original sketch made 500 attempts per draw frame. The web version performs a bounded, repeatable run instead.",
    "Debug views are generated after placement and do not consume random values.",
  ],
  computation: {
    cpu: "The TypeScript reference runs on the browser main thread. It processes candidates in order, so a large attempt budget may temporarily block interaction.",
    worker: "Not offered for Random Placement. A Worker would run the same CPU algorithm off the main thread, but this method has not been moved there.",
    gpu: "Not offered. The ordered random candidate and stopping decisions are less direct to parallelize than independent sample calculations.",
  },
};
