import { describe, expect, it, vi } from "vitest";
import { runExperiment } from "../../../../core/execution/runExperiment";
import { createImageCenterRotation } from "../../coordinates";
import { screeningExperiment } from "../../experiment";
import type { ScreeningParameters } from "../../types";
import { screenCmykClusteredDot } from "./algorithm.cpu";
import { combineIdealCmykMasks, rgbToCmyk } from "./color";
import {
  cmykAnglePresets,
  createCmykScreeningOptions,
  resolveCmykAngles,
} from "./options";
import { createCmykParameterData } from "./parameters.webgpu";
import {
  coverageToInk,
  createClusteredDotThresholdCell,
  samplePeriodicThreshold,
  sampleRotatedThreshold,
} from "./threshold";
import type { CmykScreeningOptions } from "./types";

function expectCmyk(
  actual: ReturnType<typeof rgbToCmyk>,
  expected: [number, number, number, number],
) {
  expect(actual.cyan).toBeCloseTo(expected[0]);
  expect(actual.magenta).toBeCloseTo(expected[1]);
  expect(actual.yellow).toBeCloseTo(expected[2]);
  expect(actual.black).toBeCloseTo(expected[3]);
}

function image(
  width: number,
  height: number,
  rgb: ReadonlyArray<readonly [number, number, number, number?]>,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  rgb.forEach(([red, green, blue, alpha = 255], index) => {
    const pixel = index * 4;
    data[pixel] = red;
    data[pixel + 1] = green;
    data[pixel + 2] = blue;
    data[pixel + 3] = alpha;
  });
  return { width, height, data } as ImageData;
}

function solidImage(
  width: number,
  height: number,
  color: [number, number, number, number?],
) {
  return image(
    width,
    height,
    Array.from({ length: width * height }, () => color),
  );
}

function options(
  overrides: Partial<CmykScreeningOptions> = {},
): CmykScreeningOptions {
  return {
    cellSize: 2,
    angleRadians: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
    ...overrides,
  };
}

function outputRgb(source: ImageData, screeningOptions = options()) {
  const data = screenCmykClusteredDot(source, screeningOptions).image.data;
  const result: number[][] = [];
  for (let pixel = 0; pixel < data.length; pixel += 4) {
    result.push([data[pixel], data[pixel + 1], data[pixel + 2]]);
  }
  return result;
}

describe("RGB to CMYK", () => {
  it.each([
    [[1, 1, 1], [0, 0, 0, 0]],
    [[0, 0, 0], [0, 0, 0, 1]],
    [[1, 0, 0], [0, 1, 1, 0]],
    [[0, 1, 0], [1, 0, 1, 0]],
    [[0, 0, 1], [1, 1, 0, 0]],
    [[0.5, 0.5, 0.5], [0, 0, 0, 0.5]],
  ])("converts RGB %j", (rgb, cmyk) => {
    expectCmyk(
      rgbToCmyk(rgb[0], rgb[1], rgb[2]),
      cmyk as [number, number, number, number],
    );
  });

  it("converts an arbitrary non-primary color", () => {
    expectCmyk(rgbToCmyk(0.2, 0.4, 0.6), [2 / 3, 1 / 3, 0, 0.4]);
  });
});

describe("clustered-dot threshold cell", () => {
  it("supports N = 1", () => {
    expect(Array.from(createClusteredDotThresholdCell(1).values)).toEqual([
      0.5,
    ]);
  });

  it("uses score, then y, then x as the deterministic tie order", () => {
    expect(Array.from(createClusteredDotThresholdCell(2).values)).toEqual([
      0.125, 0.375, 0.625, 0.875,
    ]);
  });

  it.each([3, 4])("creates N^2 unique thresholds inside (0, 1) for N = %i", (size) => {
    const values = Array.from(createClusteredDotThresholdCell(size).values);
    expect(values).toHaveLength(size * size);
    expect(new Set(values).size).toBe(values.length);
    values.forEach((value) => {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    });
  });

  it("gives central samples earlier ranks than corners in an odd cell", () => {
    const cell = createClusteredDotThresholdCell(3);
    expect(cell.values[4]).toBeLessThan(cell.values[0]);
    expect(cell.values[4]).toBeLessThan(cell.values[8]);
  });

  it("is byte-identical across repeated generation", () => {
    const first = createClusteredDotThresholdCell(9).values;
    const second = createClusteredDotThresholdCell(9).values;
    expect(new Uint8Array(first.buffer)).toEqual(new Uint8Array(second.buffer));
  });

  it.each([
    [0, 0],
    [0.25, 4],
    [0.5, 8],
    [0.75, 12],
    [1, 16],
  ])("activates %i of 16 samples at coverage %s", (coverage, expected) => {
    const cell = createClusteredDotThresholdCell(4);
    const active = Array.from(cell.values).filter(
      (threshold) => coverageToInk(coverage, threshold) === 1,
    );
    expect(active).toHaveLength(expected);
  });
});

describe("CMYK WebGPU contract", () => {
  it("packs dimensions, cell size, and C/M/Y/K angles at WGSL uniform offsets", () => {
    const buffer = createCmykParameterData(
      13,
      11,
      options({
        cellSize: 7,
        angleRadians: { cyan: 0.1, magenta: 0.2, yellow: 0.3, black: 0.4 },
      }),
    );
    const view = new DataView(buffer);

    expect(buffer.byteLength).toBe(32);
    expect([
      view.getUint32(0, true),
      view.getUint32(4, true),
      view.getUint32(8, true),
    ]).toEqual([13, 11, 7]);
    expect(view.getUint32(12, true)).toBe(0);
    expect(
      [16, 20, 24, 28].map((offset) => view.getFloat32(offset, true)),
    ).toEqual([
      Math.fround(0.1),
      Math.fround(0.2),
      Math.fround(0.3),
      Math.fround(0.4),
    ]);
  });

  it("registers WebGPU only for supported Screening methods", () => {
    const cmyk = screeningExperiment.methods.find(
      (method) => method.id === "cmyk-clustered-dot",
    );
    const text = screeningExperiment.methods.find(
      (method) => method.id === "text-screening",
    );

    expect(cmyk?.supportedBackends).toEqual(["cpu", "webgpu"]);
    expect(cmyk?.backends.webgpu?.id).toBe("webgpu");
    expect(text?.supportedBackends).toEqual(["cpu"]);
  });

  it("falls back to CPU with CMYK parameters intact when WebGPU is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal(
      "ImageData",
      class {
        constructor(
          public data: Uint8ClampedArray,
          public width: number,
          public height: number,
        ) {}
      },
    );

    try {
      const report = await runExperiment(
        screeningExperiment,
        "cmyk-clustered-dot",
        {
          id: "blue",
          name: "blue",
          previewUrl: "",
          imageData: image(1, 1, [[0, 0, 255]]),
        },
        {
          ...screeningExperiment.defaultParameters,
          cmykCellSize: 1,
          cmykAnglePreset: "aligned",
        },
        "webgpu",
      );

      expect(report.usedBackend).toBe("cpu");
      expect(report.fallbackReason).toContain("WebGPU is unavailable");
      expect(report.output.kind).toBe("raster");
      if (report.output.kind === "raster") {
        expect(Array.from(report.output.imageData.data)).toEqual([
          0, 0, 255, 255,
        ]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("periodic and rotated threshold sampling", () => {
  const cell = createClusteredDotThresholdCell(2);

  it("repeats periodically at angle zero", () => {
    const rotation = createImageCenterRotation(4, 4, 0);
    expect(sampleRotatedThreshold(cell, 0, 0, rotation)).toBe(cell.values[0]);
    expect(sampleRotatedThreshold(cell, 2, 0, rotation)).toBe(cell.values[0]);
  });

  it("uses pixel centers and a 90-degree rotation before lookup", () => {
    const rotation = createImageCenterRotation(4, 4, Math.PI / 2);
    expect(sampleRotatedThreshold(cell, 0, 0, rotation)).toBe(cell.values[1]);
  });

  it("wraps negative positions with positive modulo", () => {
    expect(samplePeriodicThreshold(cell, -1, -1)).toBe(cell.values[3]);
  });

  it("maps exact positive and negative cell boundaries to zero", () => {
    expect(samplePeriodicThreshold(cell, 2, -2)).toBe(cell.values[0]);
  });

  it("prints ink when coverage equals the threshold", () => {
    expect(coverageToInk(cell.values[0], cell.values[0])).toBe(1);
  });
});

describe("ideal CMYK mask composition", () => {
  it.each([
    [[0, 0, 0, 0], [1, 1, 1]],
    [[1, 0, 0, 0], [0, 1, 1]],
    [[0, 1, 0, 0], [1, 0, 1]],
    [[0, 0, 1, 0], [1, 1, 0]],
    [[0, 0, 0, 1], [0, 0, 0]],
    [[1, 1, 0, 0], [0, 0, 1]],
    [[1, 0, 1, 0], [0, 1, 0]],
    [[0, 1, 1, 0], [1, 0, 0]],
    [[1, 1, 1, 1], [0, 0, 0]],
  ])("combines masks %j", (masks, expected) => {
    const result = combineIdealCmykMasks(
      masks[0],
      masks[1],
      masks[2],
      masks[3],
    );
    expect([result.red, result.green, result.blue]).toEqual(expected);
  });
});

describe("CMYK clustered-dot screening end to end", () => {
  it("keeps an all-white image white", () => {
    expect(outputRgb(solidImage(2, 2, [255, 255, 255]))).toEqual(
      new Array(4).fill([255, 255, 255]),
    );
  });

  it("makes an all-black image black", () => {
    expect(outputRgb(solidImage(2, 2, [0, 0, 0]))).toEqual(
      new Array(4).fill([0, 0, 0]),
    );
  });

  it("reconstructs full-coverage primary patches", () => {
    const source = image(3, 1, [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    expect(outputRgb(source, options({ cellSize: 1 }))).toEqual([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
  });

  it("screens neutral gray through the black plate", () => {
    expect(outputRgb(solidImage(2, 2, [128, 128, 128]))).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [255, 255, 255],
      [255, 255, 255],
    ]);
  });

  it("composites transparent source pixels over white", () => {
    expect(outputRgb(solidImage(1, 1, [0, 0, 0, 0]))).toEqual([
      [255, 255, 255],
    ]);
  });

  it("is deterministic and returns the same output with debug enabled", () => {
    const source = image(2, 2, [
      [32, 90, 210],
      [220, 150, 40],
      [128, 128, 128],
      [245, 245, 245],
    ]);
    const withoutDebug = screenCmykClusteredDot(source, options(), false);
    const repeated = screenCmykClusteredDot(source, options(), false);
    const withDebug = screenCmykClusteredDot(source, options(), true);

    expect(withoutDebug.debug).toBeUndefined();
    expect(repeated.image.data).toEqual(withoutDebug.image.data);
    expect(withDebug.image.data).toEqual(withoutDebug.image.data);
    expect(withDebug.debug?.coverages.cyan).toHaveLength(4);
    expect(withDebug.debug?.thresholds.magenta).toHaveLength(4);
    expect(withDebug.debug?.masks.black).toHaveLength(4);
  });
});

describe("CMYK angle presets", () => {
  function parameters(
    overrides: Partial<ScreeningParameters>,
  ): ScreeningParameters {
    return Object.assign(
      { ...screeningExperiment.defaultParameters },
      overrides,
    ) as ScreeningParameters;
  }

  it("defines the approved fixed presets", () => {
    expect(cmykAnglePresets["classic-cmyk"]).toEqual({
      cyan: 15,
      magenta: 75,
      yellow: 0,
      black: 45,
    });
    expect(cmykAnglePresets.aligned).toEqual({
      cyan: 0,
      magenta: 0,
      yellow: 0,
      black: 0,
    });
    expect(cmykAnglePresets["moire-demo"]).toEqual({
      cyan: 15,
      magenta: 18,
      yellow: 0,
      black: 45,
    });
  });

  it("ignores hidden custom values for a fixed preset", () => {
    expect(
      resolveCmykAngles(
        parameters({
          cmykAnglePreset: "classic-cmyk",
          cmykCyanAngleDegrees: 321,
        }),
      ),
    ).toEqual(cmykAnglePresets["classic-cmyk"]);
  });

  it("uses all four editable values for Custom", () => {
    expect(
      resolveCmykAngles(
        parameters({
          cmykAnglePreset: "custom",
          cmykCyanAngleDegrees: -10,
          cmykMagentaAngleDegrees: 20,
          cmykYellowAngleDegrees: 30,
          cmykBlackAngleDegrees: 40,
        }),
      ),
    ).toEqual({ cyan: -10, magenta: 20, yellow: 30, black: 40 });
  });

  it("converts resolved degrees to radians", () => {
    const result = createCmykScreeningOptions(
      parameters({ cmykAnglePreset: "classic-cmyk", cmykCellSize: 12 }),
    );
    expect(result.cellSize).toBe(12);
    expect(result.angleRadians.cyan).toBeCloseTo(Math.PI / 12);
    expect(result.angleRadians.black).toBeCloseTo(Math.PI / 4);
  });
});
