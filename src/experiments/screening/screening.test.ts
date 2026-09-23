import { describe, expect, it } from "vitest";
import { normalizeKernelImage } from "./kernelNormalization";
import { screeningExperiment } from "./experiment";
import { builtInKernels, getBuiltInKernel } from "./kernels/catalog";
import { imageKernelParameters } from "./parameters";
import { screenWithImageKernel } from "./methods/image-kernel/algorithm.cpu";
import { resolveScreeningKernel } from "./methods/image-kernel/kernel";
import type { IntensityImage, ScreeningKernel } from "./types";

function intensity(
  width: number,
  height: number,
  values: number[],
): IntensityImage {
  return { width, height, values: new Float32Array(values) };
}

function kernel(
  width: number,
  height: number,
  values: number[],
): ScreeningKernel {
  return { width, height, values: new Float32Array(values) };
}

function output(source: IntensityImage, screeningKernel: ScreeningKernel) {
  return Array.from(screenWithImageKernel(source, screeningKernel).image.values);
}

describe("Image-Kernel Screening", () => {
  it("exposes one source per distinct built-in pattern", () => {
    expect(builtInKernels.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "kernel-2", label: "Ink Arch" },
      { id: "kernel-3", label: "Alternating Diagonal Gradients" },
      { id: "angela", label: "Angela Portrait" },
      { id: "smiley", label: "Smiley Face" },
    ]);
    expect(builtInKernels.map(({ src }) => src)).toEqual([
      expect.stringContaining("2.png"),
      expect.stringContaining("3.png"),
      expect.stringContaining("angela.png"),
      expect.stringContaining("smiley.png"),
    ]);
    expect(new Set(builtInKernels.map(({ src }) => src)).size).toBe(4);
    expect(getBuiltInKernel("kernel-1")).toBeUndefined();
    expect(getBuiltInKernel("kernel-4")).toBeUndefined();
  });

  it("keeps the default and visible options aligned with the retained presets", () => {
    const definition = imageKernelParameters.find(
      (parameter) => parameter.key === "builtInKernel",
    );
    if (!definition || definition.kind !== "image-select") {
      throw new Error("Built-in kernel parameter must be an image selector.");
    }
    expect(definition.defaultValue).toBe("kernel-3");
    expect(screeningExperiment.defaultParameters.builtInKernel).toBe("kernel-3");
    expect(definition.options.map(({ value }) => value)).toEqual(
      builtInKernels.map(({ id }) => id),
    );
  });

  it("uses a 1x1 black kernel as threshold 1", () => {
    expect(output(intensity(4, 1, [0, 0.5, 0.999, 1]), kernel(1, 1, [0]))).toEqual(
      [0, 0, 0, 1],
    );
  });

  it("uses a 1x1 white kernel as threshold 0", () => {
    expect(output(intensity(3, 1, [0, 0.5, 1]), kernel(1, 1, [1]))).toEqual([
      1, 1, 1,
    ]);
  });

  it("applies every value in a 2x2 kernel", () => {
    const source = intensity(2, 2, [0.9, 0.75, 0.49, 0]);
    const screeningKernel = kernel(2, 2, [0, 0.25, 0.5, 1]);
    expect(output(source, screeningKernel)).toEqual([0, 1, 0, 1]);
  });

  it("tiles a finite kernel over a larger image", () => {
    const source = intensity(6, 1, [0.6, 0.6, 0.6, 0.6, 0.6, 0.6]);
    expect(output(source, kernel(3, 1, [0, 0.5, 1]))).toEqual([
      0, 1, 1, 0, 1, 1,
    ]);
  });

  it("supports non-square kernels", () => {
    const source = intensity(4, 2, new Array(8).fill(0.5));
    const screeningKernel = kernel(2, 1, [0, 1]);
    expect(output(source, screeningKernel)).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
  });

  it("makes exact threshold equality white", () => {
    expect(output(intensity(1, 1, [0.25]), kernel(1, 1, [0.75]))).toEqual([1]);
  });

  it("constructs the threshold as one minus the kernel value", () => {
    const result = screenWithImageKernel(
      intensity(2, 1, [0.59, 0.6]),
      kernel(1, 1, [0.4]),
      true,
    );
    expect(Array.from(result.image.values)).toEqual([0, 1]);
    expect(result.debug?.thresholdField[0]).toBeCloseTo(0.6);
  });

  it("repeats both kernel axes with modulo coordinates", () => {
    const source = intensity(3, 3, new Array(9).fill(0.5));
    const result = screenWithImageKernel(
      source,
      kernel(2, 2, [0, 1, 1, 0]),
      true,
    );
    expect(Array.from(result.debug?.tiledKernel ?? [])).toEqual([
      0, 1, 0,
      1, 0, 1,
      0, 1, 0,
    ]);
    expect(Array.from(result.image.values)).toEqual([
      0, 1, 0,
      1, 0, 1,
      0, 1, 0,
    ]);
  });
});

describe("kernel image normalization", () => {
  it("composites transparent pixels over white before brightness extraction", () => {
    const source = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 0]),
    } as ImageData;

    expect(normalizeKernelImage(source, 1, 1).values[0]).toBe(1);
  });

  it("uses Processing brightness after resizing", () => {
    const source = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([32, 128, 64, 255]),
    } as ImageData;

    const normalized = normalizeKernelImage(source, 2, 1);
    expect(Array.from(normalized.values)).toEqual([
      expect.closeTo(128 / 255),
      expect.closeTo(128 / 255),
    ]);
  });

  it("resolves an uploaded custom kernel through the same normalization path", async () => {
    const customImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255,
      ]),
    } as ImageData;
    const kernel = await resolveScreeningKernel({
      ...screeningExperiment.defaultParameters,
      kernelSource: "custom",
      customKernel: {
        id: "custom-test",
        name: "custom-test.png",
        previewUrl: "data:image/png;base64,test",
        imageData: customImage,
      },
      kernelWidth: 2,
      kernelHeight: 1,
    });

    expect(Array.from(kernel.values)).toEqual([0, 1]);
  });
});
