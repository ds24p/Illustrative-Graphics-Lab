const RANDOM_DIVISOR = 16_777_216;

// Integer-only coordinate hash mirrored exactly in random-threshold/shader.wgsl.
export function hashPixelCoordinates(x: number, y: number, seed: number) {
  let value = (
    Math.imul(x, 0x1f123bb5) ^
    Math.imul(y, 0x5f356495) ^
    (seed >>> 0)
  ) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value = (value ^ (value >>> 15)) >>> 0;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

export function coordinateRandom(x: number, y: number, seed: number) {
  // The upper 24 bits convert exactly to f32 in both JavaScript and WGSL.
  return (hashPixelCoordinates(x, y, seed) >>> 8) / RANDOM_DIVISOR;
}
