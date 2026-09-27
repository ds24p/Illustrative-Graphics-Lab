import type { DebugView, PointResult, RasterResult } from "../../../../core/results/types";
import { intensityRaster } from "../../debug";
import type { IntensityImage, PlacementPoint, StipplingParameters } from "../../types";
import { nearestSiteIndex, SAMPLE_STEP, type LloydResult } from "./algorithm.cpu";
import { NO_OWNER, sampledGrid } from "./ownership";
import { toPointResult } from "./result";

export function ownershipColor(index: number): [number, number, number] {
  const hue = ((index * 137.508) % 360) / 60;
  const chroma = 0.48;
  const secondary = chroma * (1 - Math.abs((hue % 2) - 1));
  const channels: [number, number, number] = hue < 1 ? [chroma, secondary, 0]
    : hue < 2 ? [secondary, chroma, 0]
    : hue < 3 ? [0, chroma, secondary]
    : hue < 4 ? [0, secondary, chroma]
    : hue < 5 ? [secondary, 0, chroma]
    : [chroma, 0, secondary];
  return channels.map((value) => Math.round((value + 0.4) * 255)) as [number, number, number];
}

export function ownershipRaster(
  points: readonly PlacementPoint[],
  width: number,
  height: number,
): RasterResult {
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.fill(255);
  const colors = points.map((_, index) => ownershipColor(index));
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      const owner = nearestSiteIndex(x, y, points);
      if (owner < 0) continue;
      const color = colors[owner];
      for (let cellY = y; cellY < Math.min(y + SAMPLE_STEP, height); cellY += 1) {
        for (let cellX = x; cellX < Math.min(x + SAMPLE_STEP, width); cellX += 1) {
          const offset = (cellY * width + cellX) * 4;
          pixels[offset] = color[0];
          pixels[offset + 1] = color[1];
          pixels[offset + 2] = color[2];
        }
      }
    }
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function ownershipRasterFromIndices(
  owners: Uint32Array,
  siteCount: number,
  width: number,
  height: number,
): RasterResult {
  const grid = sampledGrid(width, height);
  if (owners.length !== grid.count) throw new Error("Ownership buffer has incorrect sample count.");
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.fill(255);
  const colors = Array.from({ length: siteCount }, (_, index) => ownershipColor(index));
  for (let index = 0; index < owners.length; index += 1) {
    const owner = owners[index];
    if (owner === NO_OWNER) continue;
    const color = colors[owner];
    if (!color) throw new Error("Ownership buffer contains an invalid site index.");
    const x = (index % grid.columns) * SAMPLE_STEP;
    const y = Math.floor(index / grid.columns) * SAMPLE_STEP;
    for (let cellY = y; cellY < Math.min(y + SAMPLE_STEP, height); cellY += 1) {
      for (let cellX = x; cellX < Math.min(x + SAMPLE_STEP, width); cellX += 1) {
        const offset = (cellY * width + cellX) * 4;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
      }
    }
  }
  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function createLloydDebugViews(
  original: ImageData,
  intensity: IntensityImage,
  result: LloydResult,
  output: PointResult,
  parameters: Pick<StipplingParameters, "dotSize" | "iterations" | "lloydMode">,
  precomputedOwnership?: RasterResult,
): DebugView[] {
  const { width, height } = intensity;
  const pointView = (points: readonly PlacementPoint[]) =>
    toPointResult(points, width, height, parameters.dotSize);
  return [
    { id: "original", label: "Original", result: { kind: "raster", imageData: original } },
    { id: "processing-brightness", label: "Processing Brightness", result: intensityRaster(intensity) },
    {
      id: "darkness-weight",
      label: parameters.lloydMode === "weighted" ? "Darkness / Weight Map" : "Source Darkness (not weighted)",
      result: intensityRaster(intensity, true),
    },
    { id: "initial-points", label: "Initial Points", result: pointView(result.initialPoints) },
    { id: "voronoi-ownership", label: "Voronoi Ownership", result: precomputedOwnership ?? ownershipRaster(result.finalPoints, width, height) },
    {
      id: "before-final-iteration",
      label: parameters.iterations === 0 ? "Before Final Iteration (initial)" : "Points Before Final Iteration",
      result: pointView(result.beforeFinalIteration),
    },
    { id: "after-final-iteration", label: "Points After Final Iteration", result: pointView(result.finalPoints) },
    { id: "final-stipples", label: "Final Stipples", result: output },
  ];
}
