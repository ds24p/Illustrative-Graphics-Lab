import type { ProceduralScreeningOptions } from "../../types";

export type ProceduralKernelKind = "double-sided-ramp" | "cross";

export const proceduralKernelIds: Record<ProceduralKernelKind, number> = {
  "double-sided-ramp": 0,
  cross: 1,
};

export function createProceduralParameterData(
  width: number,
  height: number,
  options: ProceduralScreeningOptions,
  kernelKind: ProceduralKernelKind,
) {
  const data = new ArrayBuffer(48);
  const view = new DataView(data);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, options.cellWidth, true);
  view.setUint32(12, options.cellHeight, true);
  view.setFloat32(16, options.angleRadians, true);
  view.setFloat32(20, options.sine.amplitude, true);
  view.setFloat32(24, options.sine.frequency, true);
  view.setFloat32(28, options.sine.phaseRadians, true);
  view.setFloat32(32, options.kernelParameters.I, true);
  view.setUint32(36, options.sine.enabled ? 1 : 0, true);
  view.setUint32(40, proceduralKernelIds[kernelKind], true);
  view.setUint32(44, 0, true);
  return data;
}
