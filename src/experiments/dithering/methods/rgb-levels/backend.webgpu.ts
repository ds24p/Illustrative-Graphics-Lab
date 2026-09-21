import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import type { RasterResult } from "../../../../core/results/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { runRgbaComputeShader } from "../../../../core/webgpu/rgbaCompute";
import { createRgbLevelsDebugViews } from "../../colorDebug";
import type { DitheringParameters } from "../../types";
import shaderSource from "./shader.wgsl?raw";

function createParameterData(width: number, height: number, levels: number) {
  const data = new ArrayBuffer(16);
  const view = new DataView(data);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, levels, true);
  view.setUint32(12, 0, true);
  return data;
}

export const rgbLevelsWebGpuBackend: WebGpuExperimentBackend<DitheringParameters> = {
  id: "webgpu",
  shaderSource,
  checkAvailability: checkWebGpuAvailability,
  async run({ source, parameters, debugEnabled }) {
    const computed = await runRgbaComputeShader({
      label: "RGB level quantization",
      shaderSource,
      imageData: source.imageData,
      parameterData: createParameterData(
        source.imageData.width,
        source.imageData.height,
        parameters.levelsPerChannel,
      ),
      workgroupSize: [8, 8],
    });
    const output: RasterResult = { kind: "raster", imageData: computed.imageData };

    if (!debugEnabled) {
      return { output, stageTimings: computed.stageTimings };
    }

    const debugStartedAt = performance.now();
    const debugViews = createRgbLevelsDebugViews(
      source.imageData,
      output,
      parameters.levelsPerChannel,
    );
    computed.stageTimings["Debug visualization"] =
      performance.now() - debugStartedAt;
    return { output, debugViews, stageTimings: computed.stageTimings };
  },
};
