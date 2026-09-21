import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import type { DebugView, RasterResult } from "../../../../core/results/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { runRgbaComputeShader } from "../../../../core/webgpu/rgbaCompute";
import {
  createDitheringDebugViews,
  scalarImageToRaster,
} from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { DitheringParameters } from "../../types";
import { createRandomThresholdField } from "./algorithm.cpu";
import shaderSource from "./shader.wgsl?raw";

function createParameterData(
  width: number,
  height: number,
  threshold: number,
  amplitude: number,
  seed: number,
) {
  const data = new ArrayBuffer(24);
  const view = new DataView(data);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setFloat32(8, threshold, true);
  view.setFloat32(12, amplitude, true);
  view.setUint32(16, seed, true);
  view.setUint32(20, 0, true);
  return data;
}

export const randomThresholdWebGpuBackend: WebGpuExperimentBackend<DitheringParameters> = {
  id: "webgpu",
  shaderSource,
  checkAvailability: checkWebGpuAvailability,
  async run({ source, parameters, debugEnabled }) {
    const { width, height } = source.imageData;
    const computed = await runRgbaComputeShader({
      label: "Random threshold dithering",
      shaderSource,
      imageData: source.imageData,
      parameterData: createParameterData(
        width,
        height,
        parameters.threshold,
        parameters.randomAmplitude,
        parameters.randomSeed,
      ),
      workgroupSize: [8, 8],
    });
    const output: RasterResult = { kind: "raster", imageData: computed.imageData };

    if (!debugEnabled) {
      return { output, stageTimings: computed.stageTimings };
    }

    const debugStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const randomThresholds = createRandomThresholdField(
      width,
      height,
      parameters.threshold,
      parameters.randomAmplitude,
      parameters.randomSeed,
    );
    const methodViews: DebugView[] = [
      {
        id: "random-threshold-map",
        label: "Random threshold map",
        result: scalarImageToRaster(randomThresholds, width, height),
      },
    ];
    const debugViews = createDitheringDebugViews(
      source.imageData,
      intensity,
      output,
      methodViews,
    );
    computed.stageTimings["Debug visualization"] =
      performance.now() - debugStartedAt;

    return { output, debugViews, stageTimings: computed.stageTimings };
  },
};
