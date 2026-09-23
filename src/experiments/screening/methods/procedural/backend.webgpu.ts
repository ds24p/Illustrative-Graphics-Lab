import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import type { RasterResult } from "../../../../core/results/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { runRgbaComputeShader } from "../../../../core/webgpu/rgbaCompute";
import { createProcessingIntensity } from "../../intensity";
import type { ProceduralKernel, ScreeningParameters } from "../../types";
import { screenProcedurally } from "./algorithm.cpu";
import { createProceduralDebugViews } from "./debug";
import { crossKernel, doubleSidedRampKernel } from "./kernels";
import { createProceduralOptions } from "./options";
import {
  createProceduralParameterData,
  type ProceduralKernelKind,
} from "./parameters.webgpu";
import shaderSource from "./shader.wgsl?raw";

function createProceduralWebGpuBackend(
  kernelKind: ProceduralKernelKind,
  cpuKernel: ProceduralKernel,
): WebGpuExperimentBackend<ScreeningParameters> {
  return {
    id: "webgpu",
    shaderSource,
    checkAvailability: checkWebGpuAvailability,
    async run({ source, parameters, debugEnabled }) {
      const options = createProceduralOptions(parameters);
      const { width, height } = source.imageData;
      const computed = await runRgbaComputeShader({
        label: `Procedural ${kernelKind} screening`,
        shaderSource,
        imageData: source.imageData,
        parameterData: createProceduralParameterData(
          width,
          height,
          options,
          kernelKind,
        ),
        workgroupSize: [8, 8],
      });
      const output: RasterResult = {
        kind: "raster",
        imageData: computed.imageData,
      };

      if (!debugEnabled) {
        return { output, stageTimings: computed.stageTimings };
      }

      const debugStartedAt = performance.now();
      const intensity = createProcessingIntensity(source.imageData);
      const reference = screenProcedurally(
        intensity,
        options,
        cpuKernel,
        true,
      );
      const debugViews = reference.debug
        ? createProceduralDebugViews(
            source.imageData,
            intensity,
            reference.debug,
            output,
          )
        : undefined;
      computed.stageTimings["CPU reference debug visualization"] =
        performance.now() - debugStartedAt;

      return { output, debugViews, stageTimings: computed.stageTimings };
    },
  };
}

export const doubleSidedRampWebGpuBackend = createProceduralWebGpuBackend(
  "double-sided-ramp",
  doubleSidedRampKernel,
);

export const crossWebGpuBackend = createProceduralWebGpuBackend(
  "cross",
  crossKernel,
);
