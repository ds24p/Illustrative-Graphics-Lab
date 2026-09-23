function mixUint32(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function normalizeTextSeed(seed: number) {
  if (!Number.isFinite(seed)) {
    throw new Error("Text Screening seed must be a finite number.");
  }
  return Math.trunc(seed) >>> 0;
}

export function randomCharacterIndex(
  cellColumn: number,
  cellRow: number,
  seed: number,
  characterCount: number,
) {
  if (!Number.isInteger(characterCount) || characterCount < 1) {
    throw new Error("The glyph atlas must contain at least one character.");
  }

  const coordinateHash =
    normalizeTextSeed(seed) ^
    Math.imul(cellColumn + 1, 0x9e3779b1) ^
    Math.imul(cellRow + 1, 0x85ebca77);
  const randomUnit = mixUint32(coordinateHash) / 0x1_0000_0000;
  return Math.floor(randomUnit * characterCount);
}
