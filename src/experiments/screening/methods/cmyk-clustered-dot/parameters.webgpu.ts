import type { CmykScreeningOptions } from "./types";

// vec2<u32>, u32, padding, vec4<f32>: 32 bytes with the angle vector at offset 16.
export function createCmykParameterData(
  width: number,
  height: number,
  options: CmykScreeningOptions,
): ArrayBuffer {
  const data = new ArrayBuffer(32);
  const view = new DataView(data);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, options.cellSize, true);
  view.setFloat32(16, options.angleRadians.cyan, true);
  view.setFloat32(20, options.angleRadians.magenta, true);
  view.setFloat32(24, options.angleRadians.yellow, true);
  view.setFloat32(28, options.angleRadians.black, true);
  return data;
}
