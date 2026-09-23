import { describe, expect, it } from "vitest";
import { deriveProceduralCellDimensions } from "../../parameters";
import type {
  IntensityImage,
  ProceduralScreeningOptions,
} from "../../types";
import { screenProcedurally } from "./algorithm.cpu";
import {
  displaceSine,
  mapModulo,
  normalizeCellDimension,
  rotateAroundImageCenter,
} from "./coordinates";
import { crossKernel, doubleSidedRampKernel } from "./kernels";

const kernelParameters = { I: 0.5 };

function options(
  overrides: Partial<ProceduralScreeningOptions> = {},
): ProceduralScreeningOptions {
  return {
    angleRadians: 0,
    cellWidth: 2,
    cellHeight: 2,
    sine: {
      enabled: false,
      amplitude: 1,
      frequency: 1,
      phaseRadians: 0,
    },
    kernelParameters,
    ...overrides,
  };
}

function intensity(
  width: number,
  height: number,
  values: number[],
): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

describe("Double-Sided Ramp kernel", () => {
  it.each([
    [0, 0],
    [0.25, 0.5],
    [0.5, 1],
    [0.75, 0.5],
  ])("evaluates s = %s", (s, expected) => {
    expect(doubleSidedRampKernel(s, 0.37, kernelParameters)).toBeCloseTo(
      expected,
    );
  });

  it("preserves both branches close to their boundary", () => {
    expect(doubleSidedRampKernel(0.5 - 1e-6, 0, kernelParameters)).toBeCloseTo(
      0.999998,
    );
    expect(doubleSidedRampKernel(0.5 + 1e-6, 0, kernelParameters)).toBeCloseTo(
      0.999998,
    );
  });
});

describe("Cross kernel", () => {
  it("evaluates both branches and keeps s = I in the first branch", () => {
    expect(crossKernel(0.25, 0.8, { I: 0.5 })).toBeCloseTo(0.4);
    expect(crossKernel(0.75, 0.8, { I: 0.5 })).toBeCloseTo(0.875);
    expect(crossKernel(0.5, 0.8, { I: 0.5 })).toBeCloseTo(0.4);
  });

  it("preserves the I = 0 endpoint", () => {
    expect(crossKernel(0, 0.8, { I: 0 })).toBe(0);
    expect(crossKernel(0.75, 0.8, { I: 0 })).toBeCloseTo(0.75);
  });

  it("preserves the I = 0.5 default", () => {
    expect(crossKernel(0.25, 0.5, { I: 0.5 })).toBeCloseTo(0.25);
  });

  it("preserves the I = 1 endpoint", () => {
    expect(crossKernel(0.25, 0.8, { I: 1 })).toBeCloseTo(0.8);
    expect(crossKernel(1, 0.8, { I: 1 })).toBeCloseTo(0.8);
  });
});

describe("procedural coordinate transformations", () => {
  it("maps ordinary positive coordinates", () => {
    expect(mapModulo({ x: 3, y: 2 }, 4, 5)).toEqual({ s: 0.75, t: 0.4 });
  });

  it("repeats coordinates larger than the cell", () => {
    expect(mapModulo({ x: 10, y: 12 }, 4, 5)).toEqual({ s: 0.5, t: 0.4 });
  });

  it("wraps negative coordinates to the positive side", () => {
    expect(mapModulo({ x: -1, y: -2 }, 4, 5)).toEqual({ s: 0.75, t: 0.6 });
  });

  it("maps exact positive and negative cell boundaries to zero", () => {
    expect(mapModulo({ x: 8, y: -5 }, 4, 5)).toEqual({ s: 0, t: 0 });
  });

  it("leaves points unchanged at angle zero", () => {
    expect(rotateAroundImageCenter(3, 1, 4, 2, 0)).toEqual({ x: 3, y: 1 });
  });

  it("rotates a known point by 90 degrees", () => {
    const rotated = rotateAroundImageCenter(3, 1, 4, 2, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(2);
    expect(rotated.y).toBeCloseTo(2);
  });

  it("uses the actual image center as the pivot", () => {
    const rotated = rotateAroundImageCenter(2, 1, 4, 2, 1.234);
    expect(rotated.x).toBeCloseTo(2);
    expect(rotated.y).toBeCloseTo(1);
  });
});

describe("sine displacement", () => {
  it("leaves coordinates unchanged when amplitude is zero", () => {
    expect(displaceSine({ s: 0.2, t: 0.25 }, 0, 4, 1)).toEqual({
      s: 0.2,
      t: 0.25,
    });
  });

  it("uses frequency and phase in the Processing equation", () => {
    const displaced = displaceSine({ s: 0.2, t: 0.25 }, 0.1, 1, 0);
    expect(displaced.s).toBeCloseTo(0.3);
    expect(displaced.t).toBe(0.25);
  });

  it("wraps values above one", () => {
    expect(displaceSine({ s: 0.9, t: 0.25 }, 0.2, 1, 0).s).toBeCloseTo(0.1);
  });

  it("wraps values below zero", () => {
    expect(
      displaceSine({ s: 0.1, t: 0 }, 0.2, 0, -Math.PI / 2).s,
    ).toBeCloseTo(0.9);
  });
});

describe("procedural screening", () => {
  it("makes exact threshold equality white", () => {
    const constantKernel = () => 0.5;
    const result = screenProcedurally(
      intensity(1, 1, [0.5]),
      options(),
      constantKernel,
    );
    expect(Array.from(result.image.values)).toEqual([1]);
  });

  it("uses K directly rather than one minus K", () => {
    const constantKernel = () => 0.2;
    const result = screenProcedurally(
      intensity(1, 1, [0.3]),
      options(),
      constantKernel,
    );
    expect(Array.from(result.image.values)).toEqual([1]);
  });

  it("screens a tiny image end to end", () => {
    const result = screenProcedurally(
      intensity(2, 2, [0.5, 0.5, 0.5, 0.5]),
      options(),
      doubleSidedRampKernel,
      true,
    );
    expect(Array.from(result.image.values)).toEqual([1, 0, 1, 0]);
    expect(Array.from(result.debug?.thresholdField ?? [])).toEqual([0, 1, 0, 1]);
  });
});

describe("source-dependent procedural defaults", () => {
  it("reproduces the original one-sixteenth conceptual scale", () => {
    expect(deriveProceduralCellDimensions(1536, 1024)).toEqual({
      cellWidth: 96,
      cellHeight: 64,
    });
  });

  it("never produces a zero-sized cell", () => {
    expect(deriveProceduralCellDimensions(8, 7)).toEqual({
      cellWidth: 1,
      cellHeight: 1,
    });
  });

  it("defensively clamps interactive cell dimensions to at least one", () => {
    expect(normalizeCellDimension(0, "Cell width")).toBe(1);
    expect(normalizeCellDimension(-12, "Cell height")).toBe(1);
  });
});
