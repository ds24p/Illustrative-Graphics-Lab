import { describe, expect, it } from "vitest";
import type { IntensityImage } from "../../../types";
import { lloydIteration, relaxLloyd } from "../algorithm.cpu";
import { historicalBorderBounds, moveHistoricalPoints, relaxHistoricalLloyd } from "./algorithm.cpu";
import { renderConeOwnership } from "./coneRaster";

function image(width: number, height: number, fill: number): IntensityImage {
  return { width, height, values: new Float32Array(width * height).fill(fill) };
}

const parameters = {
  seed: 12345,
  initialPoints: 3,
  maxAttempts: 100,
  iterations: 2,
  removeNearWhite: true,
};

describe("historical cone Lloyd movement", () => {
  it("uses all pixels rather than the reference method's 3 px samples", () => {
    const source = image(5, 1, 0);
    const sites = [{ x: 0, y: 0 }];
    const ownership = renderConeOwnership(sites, 5, 1);
    expect(moveHistoricalPoints(sites, source, ownership)).toEqual([{ x: 2, y: 0 }]);
    expect(lloydIteration(sites, source, "weighted")).toEqual([{ x: 1.5, y: 0 }]);
  });

  it("applies the 20 px historical margin without changing sampled CPU", () => {
    const source = image(60, 60, 1);
    source.values[0] = 0;
    const sites = [{ x: 0, y: 0 }];
    expect(moveHistoricalPoints(sites, source, renderConeOwnership(sites, 60, 60)))
      .toEqual([{ x: 20, y: 20 }]);
    expect(lloydIteration(sites, source, "weighted")).toEqual([{ x: 0, y: 0 }]);
    expect(historicalBorderBounds(41)).toEqual([20, 21]);
    expect(historicalBorderBounds(40)).toEqual([0, 39]);
    expect(historicalBorderBounds(1)).toEqual([0, 0]);
  });

  it("keeps a zero-weight site finite and unchanged", () => {
    const source = image(7, 5, 1);
    const sites = [{ x: 1.25, y: 3.5 }];
    const moved = moveHistoricalPoints(sites, source, renderConeOwnership(sites, 7, 5));
    expect(moved).toEqual(sites);
    expect(Number.isFinite(moved[0].x) && Number.isFinite(moved[0].y)).toBe(true);
  });

  it("uses the previous iteration's sites and repeats deterministically", () => {
    const source = image(18, 12, 0);
    const one = relaxHistoricalLloyd(source, { ...parameters, iterations: 1 });
    const two = relaxHistoricalLloyd(source, parameters);
    expect(one.initialPoints).toEqual(two.initialPoints);
    expect(two.beforeFinalIteration).toEqual(one.finalPoints);
    expect(two.finalPoints).toEqual(moveHistoricalPoints(
      one.finalPoints, source, renderConeOwnership(one.finalPoints, source.width, source.height),
    ));
    expect(two.ownership?.owners).toEqual(renderConeOwnership(one.finalPoints, 18, 12).owners);
    expect(relaxHistoricalLloyd(source, parameters)).toEqual(two);
  });

  it("shares initial sites and attempt count with sampled weighted Lloyd", () => {
    const source = image(18, 12, 0.25);
    const sampled = relaxLloyd(source, { ...parameters, lloydMode: "weighted" });
    const historical = relaxHistoricalLloyd(source, parameters);
    expect(historical.initialPoints).toEqual(sampled.initialPoints);
    expect(historical.initializationAttempts).toBe(sampled.initializationAttempts);
    expect(historical.initializationTargetReached).toBe(sampled.initializationTargetReached);
  });

  it("keeps zero-iteration initial sites and does not filter them", () => {
    const source = image(3, 2, 0.95);
    const result = relaxHistoricalLloyd(source, { ...parameters, iterations: 0, initialPoints: 1 });
    expect(result.finalPoints).toEqual(result.initialPoints);
    expect(result.renderedPoints).toEqual(result.initialPoints);
    expect(result.ownership).toBeUndefined();
  });

  it("filters final sites only after movement using the existing truncation rule", () => {
    const source = image(1, 1, 0.95);
    const filtered = relaxHistoricalLloyd(source, { ...parameters, initialPoints: 1, iterations: 1 });
    expect(filtered.initialPoints).toHaveLength(1);
    expect(filtered.finalPoints).toHaveLength(1);
    expect(filtered.renderedPoints).toHaveLength(0);
    expect(filtered.filteredPoints).toBe(1);
  });

  it("handles no accepted initial sites with a background-only ownership map", () => {
    const source = image(4, 3, 1);
    const result = relaxHistoricalLloyd(source, { ...parameters, maxAttempts: 3 });
    expect(result.initialPoints).toEqual([]);
    expect(result.finalPoints).toEqual([]);
    expect(result.renderedPoints).toEqual([]);
    expect(Array.from(result.ownership!.owners)).toEqual(Array(12).fill(-1));
  });
});
