import { describe, expect, it } from "vitest";
import type { IntensityImage } from "../../types";
import { initializeLloydPoints } from "./initialization";

function image(width: number, height: number, values: number[]): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

const parameters = { seed: 12345, initialPoints: 2, maxAttempts: 10 };

function controlled(values: number[]) {
  let index = 0;
  return () => {
    if (index === values.length) throw new Error("Test random stream was exhausted.");
    return values[index++];
  };
}

describe("Lloyd initial Placement", () => {
  it("uses the original width-1 and height-1 coordinate ranges", () => {
    const result = initializeLloydPoints(
      image(5, 3, Array(15).fill(0)),
      { ...parameters, initialPoints: 1 },
      controlled([0.75, 0.5, 0.5]),
    );
    expect(result.points).toEqual([{ x: 3, y: 1 }]);
    expect(result.attempts).toBe(1);
  });

  it("uses fixed +/-2 exclusive-upper-bound averaging and strict U > I", () => {
    const result = initializeLloydPoints(
      image(6, 1, [0, 0, 0, 0, 1, 1]),
      { ...parameters, initialPoints: 1 },
      controlled([0.6, 0, 0.25, 0.6, 0, 0.3]),
    );
    expect(result.points).toEqual([{ x: 3, y: 0 }]);
    expect(result.attempts).toBe(2);
    expect(result.targetReached).toBe(true);
  });

  it("stops at Max Attempts on white without an error", () => {
    const result = initializeLloydPoints(image(1, 1, [1]), parameters);
    expect(result.points).toEqual([]);
    expect(result.attempts).toBe(10);
    expect(result.targetReached).toBe(false);
  });

  it("repeats ordered initial points and counts for one seed", () => {
    const source = image(5, 2, Array(10).fill(0.25));
    const first = initializeLloydPoints(source, parameters);
    expect(initializeLloydPoints(source, parameters)).toEqual(first);
    expect(initializeLloydPoints(source, { ...parameters, seed: 12346 }).points)
      .not.toEqual(first.points);
  });
});
