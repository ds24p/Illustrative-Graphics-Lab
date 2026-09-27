import type { MethodEducationalContent, MethodEducationalContentDefinition } from "../../../../core/experiments/types";

export const poissonEducation: MethodEducationalContent = {
  title: "Poisson-Disc Stippling",
  summary:
    "Random candidates become dots only when their local brightness is below the cutoff and they are far enough from every previously accepted dot.",
  executionSummary: "Exact Distance runs on CPU or Web Worker. Each accepted dot affects later spacing checks, so this ordered method has no WebGPU backend.",
  collapseDetails: true,
  steps: [
    "Convert source RGB to Processing brightness and start the seeded candidate stream.",
    "Draw a floating-point candidate position; round only for the fixed 4 x 4 local-brightness lookup.",
    "Reject when average brightness is strictly greater than 0.95.",
    "Compute the candidate's exclusion radius from the selected spacing mode.",
    "Compare against every accepted point; add the candidate only when all pairwise distances meet the sum-of-radii boundary.",
    "Stop at Target Points or Max Attempts and draw accepted positions using the separate Dot Size.",
  ],
  mathematics: [
    {
      label: "Processing brightness and cutoff",
      expressions: ["I = max(R, G, B) / 255", "Iavg > 0.95 => reject"],
      explanation: "The average uses [round(x)-2, round(x)+2) x [round(y)-2, round(y)+2), clipped to the image. Exactly 0.95 remains eligible.",
    },
    {
      label: "Adaptive exclusion radius",
      expressions: ["r_candidate = R * (Iavg + 1)", "distance(candidate, existing) >= r_candidate + r_existing"],
      explanation: "Dark regions permit denser dots; lighter regions space them farther apart. These are exclusion radii, not the radius of the visible dot.",
    },
    {
      label: "Uniform exclusion radius",
      expressions: ["r_i = 2R", "distance(i, j) >= 4R"],
      explanation: "The second equation applies to two equal uniform points. It preserves the original sketch's sum-of-radii behavior.",
    },
  ],
  parameters: [
    { name: "Seed", description: "Repeats the ordered candidate sequence for identical input and settings." },
    { name: "Target Points / Max Attempts", description: "The first reached limit stops the run. Crowding can exhaust attempts before the target is reached." },
    { name: "Poisson Radius", description: "Base R, not the minimum center distance: every pair needs the sum of its stored exclusion radii." },
    { name: "Spacing Mode", description: "Adaptive stores R x (Iavg + 1); Uniform stores 2R for every eligible point." },
    { name: "Spacing Check", description: "Exact Distance scans existing points; Historical Occupancy Buffer uses a different, approximate center-lookup rule." },
    { name: "Dot Size", description: "Visible diameter only; visible dot radius is Dot Size / 2. It does not affect exclusion radii, spacing, or the random stream." },
  ],
  characteristics: [
    "This is rejection sampling with an explicit geometric check, not a raster occupancy approximation.",
    "The distance check compares squared distances; equality with the sum-of-radii boundary is accepted.",
    "As empty space becomes scarce, more proposals are rejected and each proposal can cost more.",
    "The spacing debug image shows the fixed-window local field; white marks regions above the cutoff. Uniform mode shows one constant shade in eligible regions.",
  ],
  computation: {
    cpu: "The reference TypeScript implementation runs on the main thread. Each candidate may check every accepted point (up to O(attempts x points)), so long runs can pause interaction.",
    worker: "The same reference algorithm runs on a CPU outside the main thread. It gives deterministic parity with CPU for the same input and seed, keeping controls responsive; messaging adds overhead rather than making the mathematics faster.",
    gpu: "Not offered. Candidate acceptance depends on the ordered list of dots accepted before it, unlike independent sample calculations.",
  },
};

const historicalOccupancyEducation: MethodEducationalContent = {
  title: "Poisson-Disc: Historical Occupancy Buffer",
  summary:
    "The course sketch's historical occupancy strategy replaces pairwise distance checks with a painted binary raster. It demonstrates a useful lookup approximation with different spacing behavior; it is a strategy, not an execution backend.",
  executionSummary: "CPU only: each candidate reads the occupancy left by earlier candidates. This historical raster strategy is already light for typical budgets.",
  collapseDetails: true,
  steps: [
    "Convert source RGB to Processing brightness and start the same seeded candidate stream as Exact Distance.",
    "Round each floating-point candidate only for the fixed 4 x 4 local-brightness and occupancy lookups.",
    "Reject average brightness strictly above 0.95, or a rounded center outside the image or already marked occupied.",
    "Compute testRadius as 2R in Uniform mode or R x (Iavg + 1) in Adaptive mode.",
    "Accept the floating-point center and paint a binary round footprint of stroke width testRadius into the occupancy buffer.",
    "Stop at Target Points or Max Attempts; draw accepted positions with the independent Dot Size.",
  ],
  mathematics: [
    {
      label: "Shared brightness and spacing field",
      expressions: ["I = max(R, G, B) / 255", "Iavg > 0.95 => reject", "testRadius = 2R or R x (Iavg + 1)"],
      explanation: "The candidate-generation and brightness rules are shared with the exact reference method.",
    },
    {
      label: "Historical footprint versus exact distance",
      expressions: ["footprint radius ~ testRadius / 2", "historical: rounded center is free", "exact: distance(i, j) >= r_i + r_j"],
      explanation: "Processing strokeWeight sets a width, not a radius. At R = 3 in Uniform mode, exact points require at least 12 px separation, while a width-6 occupancy mark covers roughly 3 px around an earlier point. The two rules intentionally need not yield equal counts.",
    },
  ],
  parameters: [
    { name: "Seed", description: "Repeats the ordered candidates without consuming random values for occupancy colors." },
    { name: "Target Points / Max Attempts", description: "The first reached limit stops the run; the result can differ in count from Exact Distance." },
    { name: "Poisson Radius", description: "Base R; the derived testRadius is used as the occupancy stroke width." },
    { name: "Spacing Mode", description: "Adaptive varies the painted footprint with local brightness; Uniform paints constant-width marks." },
    { name: "Spacing Check", description: "Switches between the historical image-like lookup and the separate exact pairwise algorithm." },
    { name: "Dot Size", description: "Visible diameter only; it does not change occupancy or accepted centers." },
  ],
  characteristics: [
    "A future candidate checks only footprints already painted. Its own radius does not enter a symmetric sum, so adaptive spacing is order-dependent.",
    "The occupancy debug view is the actual binary buffer used for lookup, not a recomputed geometric preview.",
    "The original sketch used random colors only to distinguish non-white pixels. This port uses a fixed occupied value and preserves the candidate RNG stream.",
    "The deterministic binary disk approximates Processing's antialiased point raster; exact pixel-for-pixel parity is not claimed.",
  ],
  computation: {
    cpu: "The TypeScript raster approximation runs on the main thread. Each candidate uses one occupancy lookup; accepted points paint a small footprint. This is often inexpensive at typical budgets, though very large runs can still pause interaction.",
    worker: "Not offered for this strategy. Moving it to a Worker would preserve the same CPU approximation but add communication overhead.",
    gpu: "Not offered. Each candidate depends on the occupied raster produced by earlier accepted candidates.",
  },
};

export const poissonEducationalContent: MethodEducationalContentDefinition = {
  variants: [
    { when: { parameter: "spacingCheck", equals: "historical-occupancy" }, content: historicalOccupancyEducation },
    { when: { parameter: "spacingCheck", equals: "exact" }, content: poissonEducation },
  ],
};
