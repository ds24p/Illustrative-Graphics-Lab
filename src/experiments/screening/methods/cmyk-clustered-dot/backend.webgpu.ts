import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import type { RasterResult } from "../../../../core/results/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { runRgbaComputeShader } from "../../../../core/webgpu/rgbaCompute";
import type { ScreeningParameters } from "../../types";
import { screenCmykClusteredDot } from "./algorithm.cpu";
import { createCmykDebugViews } from "./debug";
import { createCmykScreeningOptions } from "./options";
import { createCmykParameterData } from "./parameters.webgpu";
import { createClusteredDotThresholdCell } from "./threshold";
import shaderSource from "./shader.wgsl?raw";

export const cmykClusteredDotWebGpuBackend: WebGpuExperimentBackend<ScreeningParameters> = {
  id: "webgpu",
  shaderSource,
  checkAvailability: checkWebGpuAvailability,
  async run({ source, parameters, debugEnabled }) {
    const options = createCmykScreeningOptions(parameters);
    const cell = createClusteredDotThresholdCell(options.cellSize);
    const { width, height } = source.imageData;
    const computed = await runRgbaComputeShader({
      label: "CMYK clustered-dot screening",
      shaderSource,
      imageData: source.imageData,
      parameterData: createCmykParameterData(width, height, options),
      workgroupSize: [8, 8],
      additionalStorageInputs: [
        { label: "clustered-dot threshold cell", data: cell.values },
      ],
    });
    const output: RasterResult = { kind: "raster", imageData: computed.imageData };

    if (!debugEnabled) {
      return { output, stageTimings: computed.stageTimings };
    }

    const debugStartedAt = performance.now();
    const reference = screenCmykClusteredDot(source.imageData, options, true);
    const debugViews = reference.debug
      ? createCmykDebugViews(source.imageData, reference.debug, output)
      : undefined;
    computed.stageTimings["CPU reference debug visualization"] =
      performance.now() - debugStartedAt;

    return { output, debugViews, stageTimings: computed.stageTimings };
  },
};
