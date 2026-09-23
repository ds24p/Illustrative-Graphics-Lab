import type { ScreeningKernel } from "../../types";

export function createImageKernelParameterData(
  width: number,
  height: number,
  kernel: ScreeningKernel,
) {
  const data = new ArrayBuffer(16);
  const view = new DataView(data);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, kernel.width, true);
  view.setUint32(12, kernel.height, true);
  return data;
}
