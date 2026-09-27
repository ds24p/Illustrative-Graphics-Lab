import { describe, expect, it } from "vitest";
import { renderConeOwnership } from "./coneRaster";
import { CONE_BACKGROUND_RGB, encodeSiteIndex } from "./indexColor";
import { nearestSiteIndex } from "../algorithm.cpu";

describe("32-facet software cone ownership", () => {
  it("leaves gray background and -1 owners with no sites", () => {
    const result = renderConeOwnership([], 3, 2);
    expect(Array.from(result.encodedRgb)).toEqual(Array(6).fill(CONE_BACKGROUND_RGB));
    expect(Array.from(result.owners)).toEqual(Array(6).fill(-1));
    expect(result.depthFraction.every((value) => value === Infinity)).toBe(true);
  });

  it("lets one centered cone own a tiny square", () => {
    const result = renderConeOwnership([{ x: 2, y: 2 }], 5, 5);
    expect(Array.from(result.owners)).toEqual(Array(25).fill(0));
    expect(result.depthFraction[2 * 5 + 2]).toBe(0);
    expect(result.encodedRgb[2 * 5 + 2]).toBe(encodeSiteIndex(0));
  });

  it("splits horizontal sites by facet depth; equal boundary keeps the earlier site", () => {
    const result = renderConeOwnership([{ x: 1, y: 1 }, { x: 5, y: 1 }], 7, 3);
    expect(Array.from(result.owners.slice(7, 14))).toEqual([0, 0, 0, 0, 1, 1, 1]);
    expect(result.encodedRgb[7 + 5]).toBe(encodeSiteIndex(1));
  });

  it("splits vertically separated sites", () => {
    const result = renderConeOwnership([{ x: 1, y: 1 }, { x: 1, y: 5 }], 3, 7);
    expect(Array.from({ length: 7 }, (_, y) => result.owners[y * 3 + 1]))
      .toEqual([0, 0, 0, 0, 1, 1, 1]);
  });

  it("keeps polygonal facet ownership even where exact Euclidean ownership differs", () => {
    const points = [
      { x: 14.187331516295671, y: 22.156240423209965 },
      { x: 30.254521938040853, y: 42.292995820753276 },
    ];
    expect(nearestSiteIndex(59, 3, points)).toBe(1);
    expect(renderConeOwnership(points, 60, 60).owners[3 * 60 + 59]).toBe(0);
  });

  it("is deterministic and keeps the RGB buffer consistent with decoded owners", () => {
    const points = [{ x: 3.1, y: 2.7 }, { x: 9.4, y: 6.3 }, { x: 6.2, y: 8.1 }];
    const first = renderConeOwnership(points, 12, 10);
    expect(renderConeOwnership(points, 12, 10)).toEqual(first);
    for (let pixel = 0; pixel < first.owners.length; pixel += 1) {
      expect(first.encodedRgb[pixel]).toBe(encodeSiteIndex(first.owners[pixel]));
    }
  });
});
