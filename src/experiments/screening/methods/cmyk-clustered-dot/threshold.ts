import {
  applyImageCenterRotation,
  positiveModulo,
} from "../../coordinates";
import type { ImageCenterRotation } from "../../coordinates";
import type { ClusteredDotThresholdCell } from "./types";

interface RankedCellSample {
  x: number;
  y: number;
  score: number;
}

export function createClusteredDotThresholdCell(
  size: number,
): ClusteredDotThresholdCell {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("Screen cell size must be a positive whole number.");
  }

  const samples: RankedCellSample[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = 2 * x + 1 - size;
      const dy = 2 * y + 1 - size;
      samples.push({ x, y, score: dx * dx + dy * dy });
    }
  }

  // Equal radii are resolved by row, then column: score -> y -> x.
  samples.sort(
    (left, right) =>
      left.score - right.score || left.y - right.y || left.x - right.x,
  );

  const sampleCount = size * size;
  const values = new Float32Array(sampleCount);
  samples.forEach((sample, rank) => {
    values[sample.y * size + sample.x] = (rank + 0.5) / sampleCount;
  });

  return { size, values };
}

export function coverageToInk(coverage: number, threshold: number): 0 | 1 {
  return coverage >= threshold ? 1 : 0;
}

export function samplePeriodicThreshold(
  cell: ClusteredDotThresholdCell,
  positionX: number,
  positionY: number,
) {
  const cellX = Math.floor(positiveModulo(positionX, cell.size));
  const cellY = Math.floor(positiveModulo(positionY, cell.size));
  return cell.values[cellY * cell.size + cellX];
}

export function sampleRotatedThreshold(
  cell: ClusteredDotThresholdCell,
  pixelX: number,
  pixelY: number,
  rotation: ImageCenterRotation,
) {
  // Pixel indices are sampled at their centers. Rotation happens before
  // positive modulo and floor; threshold-cell samples are never interpolated.
  const rotated = applyImageCenterRotation(
    pixelX + 0.5,
    pixelY + 0.5,
    rotation,
  );
  return samplePeriodicThreshold(cell, rotated.x, rotated.y);
}
