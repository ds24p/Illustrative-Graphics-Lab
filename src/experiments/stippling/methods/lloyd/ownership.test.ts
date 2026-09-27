import { describe, expect, it } from "vitest";
import { cpuSampledOwnership, NO_OWNER, sampledGrid, samplePosition } from "./ownership";

describe("Sampled Lloyd ownership grid", () => {
  it("maps divisible and non-divisible dimensions in CPU loop order", () => {
    expect(sampledGrid(6, 6)).toEqual({ columns: 2, rows: 2, count: 4 });
    const grid = sampledGrid(7, 4);
    expect(grid).toEqual({ columns: 3, rows: 2, count: 6 });
    expect(Array.from({ length: grid.count }, (_, index) => samplePosition(index, grid))).toEqual([
      { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 6, y: 0 },
      { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 6, y: 3 },
    ]);
    expect(() => samplePosition(6, grid)).toThrow("outside");
    expect(() => sampledGrid(0, 4)).toThrow("positive integer");
  });

  it("returns explicit no-owner sentinel for zero sites", () => {
    expect(Array.from(cpuSampledOwnership([], 7, 4))).toEqual(Array(6).fill(NO_OWNER));
  });

  it("assigns every sample to a single site", () => {
    expect(Array.from(cpuSampledOwnership([{ x: 2, y: 1 }], 7, 4))).toEqual(Array(6).fill(0));
  });

  it("chooses nearest sites horizontally and vertically", () => {
    expect(Array.from(cpuSampledOwnership([{ x: 0, y: 0 }, { x: 6, y: 0 }], 7, 4)))
      .toEqual([0, 0, 1, 0, 0, 1]);
    expect(Array.from(cpuSampledOwnership([{ x: 0, y: 0 }, { x: 0, y: 3 }], 7, 4)))
      .toEqual([0, 0, 0, 1, 1, 1]);
  });

  it("resolves an exact integer-coordinate tie to the earliest site", () => {
    expect(Array.from(cpuSampledOwnership([{ x: 0, y: 0 }, { x: 6, y: 0 }], 4, 1)))
      .toEqual([0, 0]);
    expect(Array.from(cpuSampledOwnership([{ x: 6, y: 0 }, { x: 0, y: 0 }], 4, 1)))
      .toEqual([1, 0]);
  });

  it("returns identical ownership for repeated calls with the same sites", () => {
    const sites = [{ x: 1.25, y: 2.5 }, { x: 7.75, y: 4.5 }];
    expect(cpuSampledOwnership(sites, 11, 8)).toEqual(cpuSampledOwnership(sites, 11, 8));
  });

  it("exposes a controlled f32 boundary disagreement without changing CPU math", () => {
    const points = [{ x: 3 + 1e-8, y: 0 }, { x: 3, y: 0 }];
    expect(Array.from(cpuSampledOwnership(points, 4, 1))).toEqual([1, 1]);
    expect(Math.fround(points[0].x)).toBe(3);
    expect(Math.fround(points[1].x)).toBe(3);
  });
});
