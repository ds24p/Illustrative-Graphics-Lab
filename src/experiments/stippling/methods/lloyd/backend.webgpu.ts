import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import { checkWebGpuAvailability } from "../../../../core/webgpu/device";
import { createProcessingIntensity } from "../../intensity";
import type { StipplingParameters } from "../../types";
import { keepBelowWhiteCutoff, type LloydResult } from "./algorithm.cpu";
import { runSampledLloydWebGpu } from "./algorithm.webgpu";
import { createLloydDebugViews, ownershipRasterFromIndices } from "./debug";
import { initializeLloydPoints } from "./initialization";
import { toPointResult } from "./result";
import ownershipShader from "./ownership.wgsl?raw";

export const lloydWebGpuBackend: WebGpuExperimentBackend<StipplingParameters> = {
  id: "webgpu",
  shaderSource: ownershipShader,
  checkAvailability: checkWebGpuAvailability,
  async run({ source, parameters, debugEnabled, signal }) {
    if (parameters.lloydMode !== "unweighted" && parameters.lloydMode !== "weighted") {
      throw new Error("WebGPU supports only sampled Lloyd strategies.");
    }
    if (!Number.isFinite(parameters.dotSize) || parameters.dotSize <= 0) {
      throw new Error("Dot Size must be a positive number.");
    }
    const brightnessStartedAt = performance.now();
    const intensity = createProcessingIntensity(source.imageData);
    const brightnessMs = performance.now() - brightnessStartedAt;

    const initializationStartedAt = performance.now();
    const initialization = initializeLloydPoints(intensity, parameters);
    const initializationMs = performance.now() - initializationStartedAt;
    const gpu = await runSampledLloydWebGpu(
      initialization.points, intensity, parameters.iterations,
      parameters.lloydMode, debugEnabled, signal,
    );

    const assemblyStartedAt = performance.now();
    const renderedPoints = parameters.iterations > 0 && parameters.lloydMode === "weighted" && parameters.removeNearWhite
      ? gpu.finalPoints.filter((point) => keepBelowWhiteCutoff(point, intensity))
      : gpu.finalPoints;
    const result: LloydResult = {
      initialPoints: initialization.points,
      initializationAttempts: initialization.attempts,
      initializationTargetReached: initialization.targetReached,
      beforeFinalIteration: gpu.beforeFinalIteration ?? initialization.points,
      finalPoints: gpu.finalPoints,
      renderedPoints,
      filteredPoints: gpu.finalPoints.length - renderedPoints.length,
    };
    const output = toPointResult(renderedPoints, intensity.width, intensity.height, parameters.dotSize);
    const precomputedOwnership = debugEnabled && gpu.finalOwnership
      ? ownershipRasterFromIndices(gpu.finalOwnership, gpu.finalPoints.length, intensity.width, intensity.height)
      : undefined;
    if (debugEnabled && !precomputedOwnership) {
      throw new Error("WebGPU omitted final Lloyd ownership debug data.");
    }
    const debugViews = debugEnabled
      ? createLloydDebugViews(source.imageData, intensity, result, output, parameters, precomputedOwnership)
      : undefined;
    const assemblyMs = performance.now() - assemblyStartedAt;

    return {
      output,
      debugViews,
      statistics: [
        { label: "Initial points accepted", value: initialization.points.length.toLocaleString() },
        { label: "Initialization attempts", value: initialization.attempts.toLocaleString() },
        { label: "Initial target reached", value: initialization.targetReached ? "Yes" : "No" },
        { label: "Iterations", value: String(parameters.iterations) },
        { label: "Final rendered points", value: renderedPoints.length.toLocaleString() },
        ...(parameters.iterations > 0 && parameters.lloydMode === "weighted" && parameters.removeNearWhite
          ? [{ label: "Filtered points", value: result.filteredPoints.toLocaleString() }] : []),
        { label: "Mode", value: parameters.lloydMode === "weighted" ? "Darkness-weighted" : "Unweighted" },
        { label: "Ownership strategy", value: "Sampled WebGPU (f32)" },
      ],
      stageTimings: {
        "Source brightness": brightnessMs,
        "Seeded CPU initialization": initializationMs,
        "GPU device acquisition": gpu.timings.deviceAcquisitionMs,
        "GPU pipeline preparation": gpu.timings.pipelinePreparationMs,
        "GPU buffer setup": gpu.timings.bufferSetupMs,
        "GPU upload enqueue": gpu.timings.uploadEnqueueMs,
        "Ownership pass encoding": gpu.timings.ownershipEncodingMs,
        "Partial reduction encoding": gpu.timings.partialEncodingMs,
        "Centroid update encoding": gpu.timings.centroidEncodingMs,
        "GPU command submission": gpu.timings.submissionMs,
        "GPU completion (all passes and copies)": gpu.timings.gpuCompletionMs,
        "Final sites readback": gpu.timings.finalReadbackMs,
        ...(debugEnabled ? { "Debug readback": gpu.timings.debugReadbackMs } : {}),
        "Result and debug assembly": assemblyMs,
      },
    };
  },
};
