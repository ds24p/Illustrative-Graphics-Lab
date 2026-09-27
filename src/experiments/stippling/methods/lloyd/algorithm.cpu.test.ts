import { describe, expect, it } from "vitest";
import type { IntensityImage, PlacementPoint } from "../../types";
import { keepBelowWhiteCutoff, lloydIteration, nearestSiteIndex, relaxLloyd } from "./algorithm.cpu";

function image(width: number, height: number, values: number[]): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

const parameters = {
  seed: 12345,
  initialPoints: 2,
  maxAttempts: 100,
  iterations: 2,
  lloydMode: "unweighted" as const,
  removeNearWhite: false,
};

describe("reference Lloyd CPU", () => {
  it("finds the nearest site and gives exact ties to the earliest index", () => {
    expect(nearestSiteIndex(2, 2, [])).toBe(-1);
    expect(nearestSiteIndex(2, 2, [{ x: 9, y: 9 }])).toBe(0);
    const points: PlacementPoint[] = [{ x: 0, y: 0 }, { x: 6, y: 0 }];
    expect(nearestSiteIndex(0, 0, points)).toBe(0);
    expect(nearestSiteIndex(6, 0, points)).toBe(1);
    expect(nearestSiteIndex(3, 0, points)).toBe(0);
  });

  it("moves one site to the exact unweighted centroid of the 3 px sample grid", () => {
    const result = lloydIteration([{ x: 0, y: 0 }], image(7, 7, Array(49).fill(0)), "unweighted");
    expect(result).toEqual([{ x: 3, y: 3 }]);
  });

  it("uses darkness-weighted sums for the centroid", () => {
    const result = lloydIteration(
      [{ x: 0, y: 0 }],
      image(7, 1, [0, 0, 0, 0.5, 0, 0, 1]),
      "weighted",
    );
    expect(result).toEqual([{ x: 1, y: 0 }]);
  });

  it("keeps a site unchanged when its owned samples have zero total weight", () => {
    const result = lloydIteration([{ x: 1.25, y: 0 }], image(7, 1, Array(7).fill(1)), "weighted");
    expect(result).toEqual([{ x: 1.25, y: 0 }]);
  });

  it("uses positions from the preceding iteration", () => {
    const source = image(10, 1, Array(10).fill(0));
    const initial = [{ x: 0, y: 0 }, { x: 3, y: 0 }];
    const first = lloydIteration(initial, source, "unweighted");
    expect(first).toEqual([{ x: 0, y: 0 }, { x: 6, y: 0 }]);
    expect(lloydIteration(first, source, "unweighted"))
      .toEqual([{ x: 1.5, y: 0 }, { x: 7.5, y: 0 }]);
  });

  it("returns initial points unchanged for zero iterations", () => {
    const source = image(10, 2, Array(20).fill(0));
    const result = relaxLloyd(source, {
      ...parameters, iterations: 0, lloydMode: "weighted", removeNearWhite: true,
    });
    expect(result.finalPoints).toEqual(result.initialPoints);
    expect(result.beforeFinalIteration).toEqual(result.initialPoints);
    expect(result.renderedPoints).toEqual(result.initialPoints);
  });

  it("repeats the complete relaxation and uses each previous pass", () => {
    const source = image(10, 2, Array(20).fill(0));
    const one = relaxLloyd(source, { ...parameters, iterations: 1 });
    const two = relaxLloyd(source, { ...parameters, iterations: 2 });
    expect(two.initialPoints).toEqual(one.initialPoints);
    expect(two.beforeFinalIteration).toEqual(one.finalPoints);
    expect(two.finalPoints).toEqual(lloydIteration(one.finalPoints, source, "unweighted"));
    expect(relaxLloyd(source, { ...parameters, iterations: 2 })).toEqual(two);
  });

  it("filters only intensities strictly below 0.95 at truncated final coordinates", () => {
    const source = image(3, 1, [0.949, 0.95, 0.951]);
    expect(keepBelowWhiteCutoff({ x: 0.9, y: 0 }, source)).toBe(true);
    expect(keepBelowWhiteCutoff({ x: 1.9, y: 0 }, source)).toBe(false);
    expect(keepBelowWhiteCutoff({ x: 2.9, y: 0 }, source)).toBe(false);
    expect(keepBelowWhiteCutoff({ x: 3, y: 0 }, source)).toBe(false);
  });

  it("applies near-white cleanup only to weighted output", () => {
    const source = image(1, 1, [0.95]);
    const unweighted = relaxLloyd(source, {
      ...parameters, initialPoints: 1, iterations: 1, removeNearWhite: true,
    });
    const weighted = relaxLloyd(source, {
      ...parameters, initialPoints: 1, iterations: 1, lloydMode: "weighted", removeNearWhite: true,
    });
    expect(unweighted.initialPoints).toHaveLength(1);
    expect(unweighted.renderedPoints).toHaveLength(1);
    expect(weighted.initialPoints).toHaveLength(1);
    expect(weighted.renderedPoints).toHaveLength(0);
    expect(weighted.filteredPoints).toBe(1);
    expect(relaxLloyd(source, {
      ...parameters, initialPoints: 1, iterations: 0, lloydMode: "weighted", removeNearWhite: true,
    }).renderedPoints).toHaveLength(1);
  });

  it("handles no accepted initial sites without NaN or an app error", () => {
    const result = relaxLloyd(image(1, 1, [1]), { ...parameters, maxAttempts: 3 });
    expect(result.initialPoints).toEqual([]);
    expect(result.finalPoints).toEqual([]);
    expect(result.renderedPoints).toEqual([]);
  });
});
