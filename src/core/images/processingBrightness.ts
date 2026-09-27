export function processingBrightness(red: number, green: number, blue: number) {
  // Processing brightness() is the HSB value component, not luminance.
  return Math.max(red, green, blue) / 255;
}
