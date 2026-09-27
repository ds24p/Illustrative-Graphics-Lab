import { describe, expect, it } from "vitest";
import { comparePointResults } from "./comparePointResults";
import type { PointResult } from "./types";

const points = (coordinates: Array<[number, number]>): PointResult => ({
  kind: "points", width: 10, height: 10,
  points: coordinates.map(([x, y]) => ({ x, y })),
});

describe("ordered point comparison", () => {
  it("reports point counts and coordinate displacement", () => {
    expect(comparePointResults(points([[0, 0], [3, 4]]), points([[0, 0], [0, 0]]))).toEqual({
      firstCount: 2, secondCount: 2, pairedCount: 2,
      meanDisplacement: 2.5, maximumDisplacement: 5, maximumIndex: 1,
    });
  });

  it("does not mistake a count mismatch for complete agreement", () => {
    expect(comparePointResults(points([[0, 0]]), points([[0, 0], [1, 1]]))).toMatchObject({
      firstCount: 1, secondCount: 2, pairedCount: 1,
    });
  });
});
