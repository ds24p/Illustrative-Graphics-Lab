import { describe, expect, it } from "vitest";
import { createImageKernelParameterData } from "./methods/image-kernel/parameters.webgpu";
import {
  createProceduralParameterData,
  proceduralKernelIds,
} from "./methods/procedural/parameters.webgpu";
import type {
  ProceduralScreeningOptions,
  ScreeningKernel,
} from "./types";

describe("Image-Kernel WebGPU parameters", () => {
  it("packs image and kernel dimensions into four u32 values", () => {
    const kernel: ScreeningKernel = {
      width: 3,
      height: 2,
      values: new Float32Array(6),
    };
    const data = createImageKernelParameterData(13, 17, kernel);
    expect(Array.from(new Uint32Array(data))).toEqual([13, 17, 3, 2]);
  });

  it("has an exact integer form for every RGBA8 brightness pair", () => {
    for (let sourceByte = 0; sourceByte <= 255; sourceByte += 1) {
      for (let kernelByte = 0; kernelByte <= 255; kernelByte += 1) {
        const cpuDecision =
          Math.fround(sourceByte / 255) <
          1 - Math.fround(kernelByte / 255);
        const gpuIntegerDecision = sourceByte + kernelByte < 255;
        expect(gpuIntegerDecision).toBe(cpuDecision);
      }
    }
  });
});

describe("Procedural WebGPU parameters", () => {
  const options: ProceduralScreeningOptions = {
    angleRadians: Math.PI / 4,
    cellWidth: 11,
    cellHeight: 7,
    sine: {
      enabled: true,
      amplitude: -0.25,
      frequency: 2.5,
      phaseRadians: Math.PI / 3,
    },
    kernelParameters: { I: 0.6 },
  };

  it("packs the documented 48-byte uniform layout", () => {
    const data = createProceduralParameterData(19, 23, options, "cross");
    const view = new DataView(data);

    expect(data.byteLength).toBe(48);
    expect(view.getUint32(0, true)).toBe(19);
    expect(view.getUint32(4, true)).toBe(23);
    expect(view.getUint32(8, true)).toBe(11);
    expect(view.getUint32(12, true)).toBe(7);
    expect(view.getFloat32(16, true)).toBeCloseTo(Math.PI / 4);
    expect(view.getFloat32(20, true)).toBeCloseTo(-0.25);
    expect(view.getFloat32(24, true)).toBeCloseTo(2.5);
    expect(view.getFloat32(28, true)).toBeCloseTo(Math.PI / 3);
    expect(view.getFloat32(32, true)).toBeCloseTo(0.6);
    expect(view.getUint32(36, true)).toBe(1);
    expect(view.getUint32(40, true)).toBe(proceduralKernelIds.cross);
    expect(view.getUint32(44, true)).toBe(0);
  });

  it("distinguishes Ramp from Cross and encodes disabled sine", () => {
    const withoutSine = {
      ...options,
      sine: { ...options.sine, enabled: false },
    };
    const data = createProceduralParameterData(
      8,
      8,
      withoutSine,
      "double-sided-ramp",
    );
    const view = new DataView(data);

    expect(view.getUint32(36, true)).toBe(0);
    expect(view.getUint32(40, true)).toBe(
      proceduralKernelIds["double-sided-ramp"],
    );
  });
});
