import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import type { RasterResult } from "../../../../core/results/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { runRgbaComputeShader } from "../../../../core/webgpu/rgbaCompute";
import {
  createOrderedRgbLevelsDebugViews,
  imageDataAsRgbaImage,
} from "../../colorDebug";
import type { DitheringParameters } from "../../types";
import { quantizeRgbLevels } from "../rgb-levels/algorithm.cpu";
import { parseBayerMatrixSize } from "./algorithm.cpu";
import shaderSource from "./shader.wgsl?raw";

function createParameterData(
  width: number,
  height: number,
  levels: number,
  matrixSize: number,
) {
  const data = new ArrayBuffer(16);
  const view = new DataView(data);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, levels, true);
  view.setUint32(12, matrixSize, true);
  return data;
}

export const orderedRgbLevelsWebGpuBackend: WebGpuExperimentBackend<DitheringParameters> = {
  id: "webgpu",
  shaderSource,
  checkAvailability: checkWebGpuAvailability,
  async run({ source, parameters, debugEnabled }) {
    const matrixSize = parseBayerMatrixSize(parameters.bayerMatrixSize);
    const computed = await runRgbaComputeShader({
      label: "RGB ordered dithering",
      shaderSource,
      imageData: source.imageData,
      parameterData: createParameterData(
        source.imageData.width,
        source.imageData.height,
        parameters.levelsPerChannel,
        matrixSize,
      ),
      workgroupSize: [8, 8],
    });
    const output: RasterResult = { kind: "raster", imageData: computed.imageData };

    if (!debugEnabled) {
      return { output, stageTimings: computed.stageTimings };
    }

    const debugStartedAt = performance.now();
    const rgbSource = imageDataAsRgbaImage(source.imageData);
    const debugViews = createOrderedRgbLevelsDebugViews(
      source.imageData,
      quantizeRgbLevels(rgbSource, parameters.levelsPerChannel),
      matrixSize,
      output,
    );
    computed.stageTimings["Debug visualization"] =
      performance.now() - debugStartedAt;
    return { output, debugViews, stageTimings: computed.stageTimings };
  },
};
