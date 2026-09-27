import type { ExperimentDefinition } from "../experiments/types";
import { getExperimentMethod, getMethodSupportedBackends } from "../experiments/methods";
import type { ImageSource } from "../images/types";
import type { ExperimentParameters } from "../parameters/types";
import { compareRasterResults } from "../results/compareRasterResults";
import { comparePointResults } from "../results/comparePointResults";
import type { ExperimentResult } from "../results/types";
import { runExperiment } from "./runExperiment";
import type { BackendComparisonReport } from "./types";

export function compareBackendOutputs(first: ExperimentResult, second: ExperimentResult): NonNullable<BackendComparisonReport["difference"]> {
  if (first.kind === "raster" && second.kind === "raster") {
    return { kind: "raster", data: compareRasterResults(first, second) };
  }
  if (first.kind === "points" && second.kind === "points") {
    return { kind: "points", data: comparePointResults(first, second) };
  }
  throw new Error("These result types cannot be compared yet.");
}

export async function compareCpuAndWebGpu<
  TParameters extends ExperimentParameters,
>(
  experiment: ExperimentDefinition<TParameters>,
  methodId: string,
  source: ImageSource,
  parameters: TParameters,
  debugEnabled = false,
): Promise<BackendComparisonReport> {
  const method = getExperimentMethod(experiment, methodId);
  if (
    !getMethodSupportedBackends(method, parameters).includes("cpu") ||
    !getMethodSupportedBackends(method, parameters).includes("webgpu")
  ) {
    throw new Error(`${method.label} does not support CPU/WebGPU comparison.`);
  }

  // Run sequentially so each timing belongs to one backend execution.
  const cpu = await runExperiment(
    experiment,
    methodId,
    source,
    parameters,
    "cpu",
    debugEnabled,
  );
  const webgpu = await runExperiment(
    experiment,
    methodId,
    source,
    parameters,
    "webgpu",
    debugEnabled,
  );

  if (webgpu.usedBackend !== "webgpu") {
    return {
      cpu,
      webgpu,
      comparisonUnavailableReason:
        webgpu.fallbackReason ?? "WebGPU execution was unavailable.",
    };
  }

  try {
    return {
      cpu,
      webgpu,
      difference: compareBackendOutputs(cpu.output, webgpu.output),
    };
  } catch (comparisonError) {
    return {
      cpu,
      webgpu,
      comparisonUnavailableReason:
        comparisonError instanceof Error
          ? comparisonError.message
          : "The results could not be compared.",
    };
  }
}
