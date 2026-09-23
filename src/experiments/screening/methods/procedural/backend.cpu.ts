import type { ExperimentBackend } from "../../../../core/backends/types";
import { binaryImageToRaster } from "../../debug";
import { createProcessingIntensity } from "../../intensity";
import type { ProceduralKernel, ScreeningParameters } from "../../types";
import { screenProcedurally } from "./algorithm.cpu";
import { createProceduralDebugViews } from "./debug";
import { crossKernel, doubleSidedRampKernel } from "./kernels";
import { createProceduralOptions } from "./options";

function createProceduralCpuBackend(
  kernel: ProceduralKernel,
): ExperimentBackend<ScreeningParameters> {
  return {
    id: "cpu",
    async run({ source, parameters, debugEnabled }) {
      const preparationStartedAt = performance.now();
      const intensity = createProcessingIntensity(source.imageData);
      const options = createProceduralOptions(parameters);
      const preparationMs = performance.now() - preparationStartedAt;

      const algorithmStartedAt = performance.now();
      const result = screenProcedurally(
        intensity,
        options,
        kernel,
        debugEnabled,
      );
      const algorithmMs = performance.now() - algorithmStartedAt;

      const conversionStartedAt = performance.now();
      const output = binaryImageToRaster(result.image);
      const debugViews =
        debugEnabled && result.debug
          ? createProceduralDebugViews(
              source.imageData,
              intensity,
              result.debug,
              output,
            )
          : undefined;
      const conversionMs = performance.now() - conversionStartedAt;

      return {
        output,
        debugViews,
        stageTimings: {
          "Source and parameter preparation": preparationMs,
          "Algorithm execution": algorithmMs,
          "Result conversion": conversionMs,
        },
      };
    },
  };
}

export const doubleSidedRampCpuBackend = createProceduralCpuBackend(
  doubleSidedRampKernel,
);

export const crossCpuBackend = createProceduralCpuBackend(crossKernel);
