import { describe, expect, it } from "vitest";
import type { IntensityImage } from "../../types";
import { distantEnough, exclusionRadius, placePoissonStipples } from "./algorithm.cpu";
import { occupancyAllows, paintOccupancyFootprint, placeHistoricalPoissonStipples } from "./historical.cpu";

function blackImage(width: number, height: number): IntensityImage {
  return { width, height, values: new Float32Array(width * height) };
}

function controlled(values: number[]) {
  let index = 0;
  return () => {
    if (index === values.length) throw new Error("Test random stream was exhausted.");
    return values[index++];
  };
}

const parameters = {
  seed: 7,
  targetPoints: 2,
  maxAttempts: 2,
  poissonRadius: 3,
  spacingMode: "uniform" as const,
};

describe("historical Poisson occupancy raster", () => {
  it("accepts a valid candidate on an empty buffer", () => {
    expect(occupancyAllows(new Uint8Array(100), 10, 10, 4.2, 5.1)).toBe(true);
  });

  it("rejects an occupied rounded center but accepts outside the painted footprint", () => {
    const occupancy = new Uint8Array(20 * 10);
    paintOccupancyFootprint(occupancy, 20, 10, 5, 5, 6);
    expect(occupancyAllows(occupancy, 20, 10, 6.1, 5)).toBe(false);
    expect(occupancyAllows(occupancy, 20, 10, 9, 5)).toBe(true);
    expect(occupancy[5 * 20 + 8]).toBe(1);
    expect(occupancy[5 * 20 + 9]).toBe(0);
  });

  it("uses half the stroke width as disk radius, with a forced center for tiny marks", () => {
    const occupancy = new Uint8Array(20 * 10);
    paintOccupancyFootprint(occupancy, 20, 10, 5, 5, 6);
    expect(occupancy[5 * 20 + 8]).toBe(1);
    expect(occupancy[5 * 20 + 9]).toBe(0);
    paintOccupancyFootprint(occupancy, 20, 10, 15.4, 5.4, 0.5);
    expect(occupancy[5 * 20 + 15]).toBe(1);
  });

  it("rejects a rounded lookup beyond the far edge without wrapping the array", () => {
    const occupancy = new Uint8Array(20 * 10);
    expect(occupancyAllows(occupancy, 20, 10, 19.6, 4)).toBe(false);
    expect(occupancyAllows(occupancy, 20, 10, 4, 9.6)).toBe(false);
    expect(occupancyAllows(occupancy, 20, 10, 19.4, 9.4)).toBe(true);
  });

  it("accepts a point exact pairwise spacing rejects under the same candidates", () => {
    const source = blackImage(20, 10);
    const stream = [5 / 20, 5 / 10, 9 / 20, 5 / 10];
    const exact = placePoissonStipples(source, parameters, controlled(stream));
    const historical = placeHistoricalPoissonStipples(source, parameters, controlled(stream));
    expect(exact.points).toHaveLength(1);
    expect(historical.points).toHaveLength(2);
    expect(exact.attempts).toBe(2);
    expect(historical.attempts).toBe(2);
    expect(distantEnough(9, 5, 6, exact.points)).toBe(false);
  });

  it("depends on the earlier adaptive footprint, not a symmetric sum", () => {
    const narrow = exclusionRadius(3, 0, "adaptive");
    const wide = exclusionRadius(3, 1, "adaptive");
    const narrowFirst = new Uint8Array(20 * 10);
    const wideFirst = new Uint8Array(20 * 10);
    paintOccupancyFootprint(narrowFirst, 20, 10, 5, 5, narrow);
    paintOccupancyFootprint(wideFirst, 20, 10, 5, 5, wide);
    expect(occupancyAllows(narrowFirst, 20, 10, 7, 5)).toBe(true);
    expect(occupancyAllows(wideFirst, 20, 10, 7, 5)).toBe(false);
    expect(distantEnough(7, 5, wide, [{ x: 5, y: 5, exclusionRadius: narrow }])).toBe(false);
  });

  it("repeats ordered points, attempts, and occupancy for the same seed", () => {
    const source = blackImage(30, 20);
    const settings = { ...parameters, targetPoints: 25, maxAttempts: 60, spacingMode: "adaptive" as const };
    const first = placeHistoricalPoissonStipples(source, settings);
    expect(placeHistoricalPoissonStipples(source, settings)).toEqual(first);
    expect(placeHistoricalPoissonStipples(source, { ...settings, seed: 8 }).points)
      .not.toEqual(first.points);
  });
});
