export type PaletteDitheringStrategy = "none" | "floyd-steinberg";

export function parsePaletteDitheringStrategy(
  value: string,
): PaletteDitheringStrategy {
  if (value === "none" || value === "floyd-steinberg") return value;
  throw new Error(`Unknown palette dithering strategy: ${value}`);
}
