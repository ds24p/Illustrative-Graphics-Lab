import { describe, expect, it } from "vitest";
import type { IntensityImage, PoissonPoint } from "../../types";
import { distantEnough, exclusionRadius, placePoissonStipples } from "./algorithm.cpu";

function image(width: number, height: number, values: number[]): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

const parameters = {
  seed: 12345,
  targetPoints: 3,
  maxAttempts: 12,
  poissonRadius: 3,
  spacingMode: "adaptive" as const,
};

function controlled(values: number[]) {
  let index = 0;
  return () => {
    if (index === values.length) throw new Error("Test random stream was exhausted.");
    return values[index++];
  };
}

describe("Poisson-Disc CPU", () => {
  it("uses the exact adaptive and uniform exclusion-radius formulas", () => {
    expect(exclusionRadius(3, 0, "adaptive")).toBe(3);
    expect(exclusionRadius(3, 0.5, "adaptive")).toBe(4.5);
    expect(exclusionRadius(3, 0.95, "adaptive")).toBeCloseTo(5.85);
    expect(exclusionRadius(3, 0, "uniform")).toBe(6);
    expect(exclusionRadius(3, 0.95, "uniform")).toBe(6);
  });

  it("requires 4R center distance for two uniform points and accepts equality", () => {
    const points: PoissonPoint[] = [{ x: 0, y: 0, exclusionRadius: 6 }];
    expect(distantEnough(11.999, 0, 6, points)).toBe(false);
    expect(distantEnough(12, 0, 6, points)).toBe(true);
    expect(distantEnough(12.001, 0, 6, points)).toBe(true);
  });

  it("uses the sum of different stored radii", () => {
    const points: PoissonPoint[] = [{ x: 0, y: 0, exclusionRadius: 3 }];
    expect(distantEnough(7.499, 0, 4.5, points)).toBe(false);
    expect(distantEnough(7.5, 0, 4.5, points)).toBe(true);
    expect(distantEnough(7.501, 0, 4.5, points)).toBe(true);
  });

  it("accepts an eligible first point but rejects local brightness strictly above 0.95", () => {
    for (const brightness of [0.949, 0.95]) {
      const result = placePoissonStipples(
        image(1, 1, [brightness]),
        { ...parameters, targetPoints: 1, maxAttempts: 1 },
        controlled([0.25, 0.75]),
      );
      expect(result.points).toHaveLength(1);
      expect(result.points[0].exclusionRadius).toBeCloseTo(3 * (brightness + 1));
    }
    const tooBright = placePoissonStipples(
      image(1, 1, [0.951]),
      { ...parameters, targetPoints: 1, maxAttempts: 1 },
      controlled([0.25, 0.75]),
    );
    expect(tooBright.points).toEqual([]);
    expect(tooBright.attempts).toBe(1);
  });

  it("draws only candidate x and y, preserving floating-point positions", () => {
    const result = placePoissonStipples(
      image(1, 1, [0]),
      { ...parameters, targetPoints: 1 },
      controlled([0.25, 0.75]),
    );
    expect(result.points).toEqual([{ x: 0.25, y: 0.75, exclusionRadius: 3 }]);
    expect(result.attempts).toBe(1);
    expect(result.targetReached).toBe(true);
  });

  it("stops at Max Attempts when a dark image is crowded", () => {
    const result = placePoissonStipples(
      image(1, 1, [0]),
      { ...parameters, targetPoints: 2, maxAttempts: 3 },
      controlled([0.1, 0.1, 0.9, 0.9, 0.5, 0.5]),
    );
    expect(result.points).toHaveLength(1);
    expect(result.attempts).toBe(3);
    expect(result.targetReached).toBe(false);
    expect(result.acceptanceRate).toBeCloseTo(1 / 3);
  });

  it("leaves an all-white image empty without treating it as an error", () => {
    const result = placePoissonStipples(
      image(2, 2, [1, 1, 1, 1]),
      { ...parameters, maxAttempts: 4 },
    );
    expect(result.points).toEqual([]);
    expect(result.attempts).toBe(4);
    expect(result.acceptanceRate).toBe(0);
  });

  it("uses the fixed local window on a synthetic image with strong density contrast", () => {
    const result = placePoissonStipples(
      image(10, 1, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]),
      { ...parameters, targetPoints: 2, maxAttempts: 2 },
      controlled([0.01, 0, 0.9, 0]),
    );
    expect(result.points).toEqual([{ x: 0.1, y: 0, exclusionRadius: 3 }]);
    expect(result.attempts).toBe(2);
  });

  it("repeats ordered coordinates, radii, and counts for one seed", () => {
    const source = image(20, 2, Array.from({ length: 40 }, (_, index) => index < 20 ? 0 : 0.5));
    const first = placePoissonStipples(source, { ...parameters, poissonRadius: 1 });
    expect(placePoissonStipples(source, { ...parameters, poissonRadius: 1 })).toEqual(first);
    expect(placePoissonStipples(source, { ...parameters, poissonRadius: 1, seed: 12346 }).points)
      .not.toEqual(first.points);
  });

  it("rejects invalid budgets, radius, and spacing mode", () => {
    expect(() => placePoissonStipples(image(1, 1, [0]), { ...parameters, maxAttempts: 0 }))
      .toThrow(/positive/);
    expect(() => placePoissonStipples(image(1, 1, [0]), { ...parameters, poissonRadius: 0 }))
      .toThrow(/positive/);
    expect(() => placePoissonStipples(image(1, 1, [0]), { ...parameters, spacingMode: "wrong" as "adaptive" }))
      .toThrow(/valid spacing mode/);
  });
});
