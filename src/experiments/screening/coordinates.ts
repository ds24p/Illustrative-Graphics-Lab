import type { ImagePoint, NormalizedPoint } from "./types";

export interface ImageCenterRotation {
  centerX: number;
  centerY: number;
  cosine: number;
  sine: number;
}

export function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function normalizeCellDimension(value: number, name: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return Math.max(1, Math.round(value));
}

export function createImageCenterRotation(
  width: number,
  height: number,
  radians: number,
): ImageCenterRotation {
  return {
    centerX: width / 2,
    centerY: height / 2,
    cosine: Math.cos(radians),
    sine: Math.sin(radians),
  };
}

export function applyImageCenterRotation(
  x: number,
  y: number,
  rotation: ImageCenterRotation,
): ImagePoint {
  const translatedX = x - rotation.centerX;
  const translatedY = y - rotation.centerY;

  return {
    x:
      translatedX * rotation.cosine -
      translatedY * rotation.sine +
      rotation.centerX,
    y:
      translatedX * rotation.sine +
      translatedY * rotation.cosine +
      rotation.centerY,
  };
}

export function rotateAroundImageCenter(
  x: number,
  y: number,
  width: number,
  height: number,
  radians: number,
): ImagePoint {
  return applyImageCenterRotation(
    x,
    y,
    createImageCenterRotation(width, height, radians),
  );
}

export function positiveModulo(value: number, modulus: number) {
  if (!Number.isFinite(modulus) || modulus <= 0) {
    throw new Error("Modulo dimensions must be positive finite numbers.");
  }

  const remainder = value % modulus;
  if (remainder === 0) return 0;
  return remainder < 0 ? remainder + modulus : remainder;
}

export function mapModulo(
  position: ImagePoint,
  cellWidth: number,
  cellHeight: number,
): NormalizedPoint {
  // Modulo returns each image-space point to the same local repeating cell.
  return {
    s: positiveModulo(position.x, cellWidth) / cellWidth,
    t: positiveModulo(position.y, cellHeight) / cellHeight,
  };
}

export function wrapUnit(value: number) {
  return positiveModulo(value, 1);
}

export function displaceSine(
  point: NormalizedPoint,
  amplitude: number,
  frequency: number,
  phaseRadians: number,
): NormalizedPoint {
  const displacement =
    amplitude * Math.sin(frequency * 2 * Math.PI * point.t + phaseRadians);

  return {
    s: wrapUnit(point.s + displacement),
    t: point.t,
  };
}
