import type { ExperimentResult, RasterResult } from "./types";

export interface RasterDifference {
  differentPixels: number;
  maximumChannelDifference: number;
  totalPixels: number;
}

function requireRaster(result: ExperimentResult): RasterResult {
  if (result.kind !== "raster") {
    throw new Error("Pixel comparison currently requires two raster results.");
  }
  return result;
}

export function compareRasterResults(
  firstResult: ExperimentResult,
  secondResult: ExperimentResult,
): RasterDifference {
  const first = requireRaster(firstResult).imageData;
  const second = requireRaster(secondResult).imageData;

  if (first.width !== second.width || first.height !== second.height) {
    throw new Error("Raster results have different dimensions.");
  }

  let differentPixels = 0;
  let maximumChannelDifference = 0;

  for (let pixel = 0; pixel < first.width * first.height; pixel += 1) {
    const offset = pixel * 4;
    let pixelDiffers = false;

    for (let channel = 0; channel < 4; channel += 1) {
      const difference = Math.abs(
        first.data[offset + channel] - second.data[offset + channel],
      );
      if (difference > 0) pixelDiffers = true;
      maximumChannelDifference = Math.max(maximumChannelDifference, difference);
    }

    if (pixelDiffers) differentPixels += 1;
  }

  return {
    differentPixels,
    maximumChannelDifference,
    totalPixels: first.width * first.height,
  };
}
