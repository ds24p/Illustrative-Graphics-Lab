import type { PlacementPoint } from "../../types";
import { nearestSiteIndex, SAMPLE_STEP } from "./algorithm.cpu";

export const NO_OWNER = 0xffff_ffff;

export interface SampleGrid {
  columns: number;
  rows: number;
  count: number;
}

export function sampledGrid(width: number, height: number): SampleGrid {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("Sampled ownership needs positive integer image dimensions.");
  }
  const columns = Math.ceil(width / SAMPLE_STEP);
  const rows = Math.ceil(height / SAMPLE_STEP);
  return { columns, rows, count: columns * rows };
}

export function samplePosition(index: number, grid: SampleGrid): PlacementPoint {
  if (!Number.isInteger(index) || index < 0 || index >= grid.count) {
    throw new Error("Sample index is outside the sampled image grid.");
  }
  return {
    x: (index % grid.columns) * SAMPLE_STEP,
    y: Math.floor(index / grid.columns) * SAMPLE_STEP,
  };
}

export function cpuSampledOwnership(
  points: readonly PlacementPoint[],
  width: number,
  height: number,
): Uint32Array {
  const grid = sampledGrid(width, height);
  const owners = new Uint32Array(grid.count);
  for (let index = 0; index < grid.count; index += 1) {
    const x = (index % grid.columns) * SAMPLE_STEP;
    const y = Math.floor(index / grid.columns) * SAMPLE_STEP;
    const owner = nearestSiteIndex(x, y, points);
    owners[index] = owner < 0 ? NO_OWNER : owner;
  }
  return owners;
}
