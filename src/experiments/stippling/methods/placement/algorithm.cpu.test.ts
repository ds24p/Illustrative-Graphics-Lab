import { describe, expect, it } from "vitest";
import type { IntensityImage } from "../../types";
import { acceptsPlacementCandidate, placeStipples } from "./algorithm.cpu";

function image(width: number, height: number, values: number[]): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

const parameters = {
  seed: 12345,
  targetPoints: 3,
  maxAttempts: 7,
  intensityWindow: 1,
};

function controlled(values: number[]) {
  let index = 0;
  return () => {
    if (index === values.length) throw new Error("Test random stream was exhausted.");
    return values[index++];
  };
}

describe("Random Placement CPU", () => {
  it("uses the strict Processing acceptance comparison", () => {
    expect(acceptsPlacementCandidate(0, 0.25)).toBe(true);
    expect(acceptsPlacementCandidate(1, 0.75)).toBe(false);
    expect(acceptsPlacementCandidate(0.5, 0.25)).toBe(false);
    expect(acceptsPlacementCandidate(0.5, 0.75)).toBe(true);
    expect(acceptsPlacementCandidate(0.5, 0.5)).toBe(false);
    expect(acceptsPlacementCandidate(0, 0)).toBe(false);
  });

  it("stops immediately when Target Points is reached", () => {
    const result = placeStipples(image(2, 2, [0, 0, 0, 0]), parameters);
    expect(result.points).toHaveLength(3);
    expect(result.attempts).toBe(3);
    expect(result.targetReached).toBe(true);
    expect(result.acceptanceRate).toBe(1);
  });

  it("stops at Max Attempts on an all-white image without failing", () => {
    const result = placeStipples(image(2, 2, [1, 1, 1, 1]), parameters);
    expect(result.points).toEqual([]);
    expect(result.attempts).toBe(7);
    expect(result.targetReached).toBe(false);
    expect(result.acceptanceRate).toBe(0);
  });

  it("uses three random values per attempt and preserves floating-point positions", () => {
    const result = placeStipples(
      image(1, 1, [0.5]),
      { ...parameters, targetPoints: 1 },
      controlled([0.1, 0.2, 0.25, 0.3, 0.4, 0.75]),
    );
    expect(result.points).toEqual([{ x: 0.3, y: 0.4 }]);
    expect(result.attempts).toBe(2);
    expect(result.acceptanceRate).toBe(0.5);
  });

  it("rounds only for lookup and clips the local window at image borders", () => {
    const result = placeStipples(
      image(4, 1, [0, 0, 1, 1]),
      { ...parameters, targetPoints: 2, maxAttempts: 2 },
      controlled([0.025, 0, 0.5, 0.775, 0, 0.5]),
    );
    expect(result.points).toEqual([{ x: 0.1, y: 0 }]);
    expect(result.attempts).toBe(2);
    expect(result.targetReached).toBe(false);
  });

  it("repeats ordered coordinates and counts for one seed", () => {
    const source = image(4, 2, [0, 0.25, 0.75, 1, 0.1, 0.4, 0.8, 0.9]);
    const first = placeStipples(source, parameters);
    expect(placeStipples(source, parameters)).toEqual(first);
    expect(placeStipples(source, { ...parameters, seed: 12346 }).points)
      .not.toEqual(first.points);
  });

  it("rejects unsafe window and termination parameters", () => {
    expect(() => placeStipples(image(1, 1, [0]), { ...parameters, intensityWindow: 0 }))
      .toThrow(/positive integers/);
    expect(() => placeStipples(image(1, 1, [0]), { ...parameters, maxAttempts: 0 }))
      .toThrow(/positive integers/);
  });
});
