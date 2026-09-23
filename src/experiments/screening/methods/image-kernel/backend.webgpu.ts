import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import type { RasterResult } from "../../../../core/results/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { runRgbaComputeShader } from "../../../../core/webgpu/rgbaCompute";
import { createScreeningDebugViews } from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { ScreeningParameters } from "../../types";
import { screenWithImageKernel } from "./algorithm.cpu";
import { resolveScreeningKernel } from "./kernel";
import { createImageKernelParameterData } from "./parameters.webgpu";
import shaderSource from "./shader.wgsl?raw";

export const imageKernelWebGpuBackend: WebGpuExperimentBackend<ScreeningParameters> = {
  id: "webgpu",
  shaderSource,
  checkAvailability: checkWebGpuAvailability,
  async run({ source, parameters, debugEnabled }) {
    const kernel = await resolveScreeningKernel(parameters);
    const { width, height } = source.imageData;
    const computed = await runRgbaComputeShader({
      label: "Image-kernel screening",
      shaderSource,
      imageData: source.imageData,
      parameterData: createImageKernelParameterData(width, height, kernel),
      workgroupSize: [8, 8],
      additionalStorageInputs: [
        { label: "normalized kernel values", data: kernel.values },
      ],
    });
    const output: RasterResult = { kind: "raster", imageData: computed.imageData };

    if (!debugEnabled) {
      return { output, stageTimings: computed.stageTimings };
    }

    const debugStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const reference = screenWithImageKernel(intensity, kernel, true);
    const debugViews = reference.debug
      ? createScreeningDebugViews(
          source.imageData,
          intensity,
          kernel,
          reference.debug,
          output,
        )
      : undefined;
    computed.stageTimings["CPU reference debug visualization"] =
      performance.now() - debugStartedAt;

    return { output, debugViews, stageTimings: computed.stageTimings };
  },
};
