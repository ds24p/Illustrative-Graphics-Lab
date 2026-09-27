import { getWebGpuDevice } from "../../../../core/webgpu/device";
import type { IntensityImage, PlacementPoint } from "../../types";
import { SAMPLE_STEP } from "./algorithm.cpu";
import { NO_OWNER, sampledGrid } from "./ownership";
import { computeSampledOwnershipWebGpu, getOwnershipPipeline, OWNERSHIP_WORKGROUP_SIZE } from "./ownership.webgpu";
import partialShader from "./partial.wgsl?raw";
import centroidShader from "./centroid.wgsl?raw";

export const CENTROID_WORKGROUP_SIZE = 128;
export const PARTIAL_WORKGROUP_SIZE = 128;
export const SAMPLES_PER_TILE = 256;

export interface GpuLloydTimings {
  deviceAcquisitionMs: number;
  pipelinePreparationMs: number;
  bufferSetupMs: number;
  uploadEnqueueMs: number;
  ownershipEncodingMs: number;
  partialEncodingMs: number;
  centroidEncodingMs: number;
  submissionMs: number;
  gpuCompletionMs: number;
  finalReadbackMs: number;
  debugReadbackMs: number;
  totalMs: number;
  deviceReused: boolean;
  pipelinesReused: boolean;
}

export interface GpuLloydResult {
  finalPoints: PlacementPoint[];
  beforeFinalIteration?: PlacementPoint[];
  finalOwnership?: Uint32Array;
  timings: GpuLloydTimings;
}

interface Pipelines {
  partial: GPUComputePipeline;
  centroid: GPUComputePipeline;
}

const pipelineCache = new WeakMap<GPUDevice, Promise<Pipelines>>();

async function getPipelines(device: GPUDevice) {
  let pending = pipelineCache.get(device);
  const reused = Boolean(pending);
  if (!pending) {
    pending = Promise.all([
      device.createComputePipelineAsync({
        label: "Sampled Lloyd partial centroid sums",
        layout: "auto",
        compute: { module: device.createShaderModule({ code: partialShader }), entryPoint: "main" },
      }),
      device.createComputePipelineAsync({
        label: "Sampled Lloyd centroid update",
        layout: "auto",
        compute: { module: device.createShaderModule({ code: centroidShader }), entryPoint: "main" },
      }),
    ]).then(([partial, centroid]) => ({ partial, centroid }));
    pipelineCache.set(device, pending);
    void pending.catch(() => pipelineCache.delete(device));
  }
  return { pipelines: await pending, reused };
}

function abortIfRequested(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Run was cancelled.", "AbortError");
}

async function readPoints(buffer: GPUBuffer, count: number): Promise<PlacementPoint[]> {
  await buffer.mapAsync(GPUMapMode.READ);
  const values = new Float32Array(buffer.getMappedRange().slice(0));
  buffer.unmap();
  return Array.from({ length: count }, (_, index) => ({
    x: values[2 * index], y: values[2 * index + 1],
  }));
}

// The CPU caller owns initialization and final filtering. Only Lloyd movement runs here.
export async function runSampledLloydWebGpu(
  initialPoints: readonly PlacementPoint[],
  intensity: IntensityImage,
  iterations: number,
  mode: "unweighted" | "weighted",
  debugEnabled = false,
  signal?: AbortSignal,
): Promise<GpuLloydResult> {
  const startedAt = performance.now();
  if (!Number.isInteger(iterations) || iterations < 0) {
    throw new Error("Iterations must be a nonnegative integer.");
  }
  const { width, height } = intensity;
  const grid = sampledGrid(width, height);
  const count = initialPoints.length;
  if (count >= 0xffff_ffff || initialPoints.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new Error("Lloyd sites must have finite coordinates and valid indices.");
  }
  if (mode === "weighted" && intensity.values.length !== width * height) {
    throw new Error("Lloyd brightness buffer has incorrect dimensions.");
  }
  abortIfRequested(signal);

  const emptyTimings = (): GpuLloydTimings => ({
    deviceAcquisitionMs: 0, pipelinePreparationMs: 0, bufferSetupMs: 0,
    uploadEnqueueMs: 0, ownershipEncodingMs: 0, partialEncodingMs: 0,
    centroidEncodingMs: 0, submissionMs: 0, gpuCompletionMs: 0,
    finalReadbackMs: 0, debugReadbackMs: 0,
    totalMs: performance.now() - startedAt, deviceReused: false, pipelinesReused: false,
  });
  if (iterations === 0 || count === 0) {
    if (!debugEnabled || count === 0) {
      return {
        finalPoints: [...initialPoints],
        beforeFinalIteration: debugEnabled ? [...initialPoints] : undefined,
        finalOwnership: debugEnabled ? new Uint32Array(grid.count).fill(NO_OWNER) : undefined,
        timings: emptyTimings(),
      };
    }
    const ownership = await computeSampledOwnershipWebGpu(initialPoints, width, height);
    return {
      finalPoints: [...initialPoints],
      beforeFinalIteration: [...initialPoints],
      finalOwnership: ownership.owners,
      timings: {
        deviceAcquisitionMs: ownership.timings.deviceAcquisitionMs,
        pipelinePreparationMs: ownership.timings.pipelineCreationMs,
        bufferSetupMs: ownership.timings.bufferSetupMs,
        uploadEnqueueMs: ownership.timings.pointUploadMs + ownership.timings.configUploadMs,
        ownershipEncodingMs: ownership.timings.computeSubmitMs,
        partialEncodingMs: 0,
        centroidEncodingMs: 0,
        submissionMs: 0,
        gpuCompletionMs: ownership.timings.computeCompletionWaitMs,
        finalReadbackMs: 0,
        debugReadbackMs: ownership.timings.readbackMs,
        totalMs: performance.now() - startedAt,
        deviceReused: ownership.timings.deviceReused,
        pipelinesReused: ownership.timings.pipelineReused,
      },
    };
  }

  const deviceHandle = await getWebGpuDevice();
  const { device } = deviceHandle;
  abortIfRequested(signal);
  const pipelineStartedAt = performance.now();
  const [{ pipeline: ownershipPipeline, reused: ownershipReused }, { pipelines, reused: reductionReused }] = await Promise.all([
    getOwnershipPipeline(device), getPipelines(device),
  ]);
  const pipelinePreparationMs = performance.now() - pipelineStartedAt;
  const tileCount = Math.ceil(grid.count / SAMPLES_PER_TILE);
  const siteBytes = Math.max(8, count * 8);
  const ownershipBytes = grid.count * 4;
  const partialBytes = Math.max(16, tileCount * count * 16);
  const brightnessBytes = mode === "weighted" ? intensity.values.byteLength : 4;
  const workgroupLimit = device.limits.maxComputeWorkgroupsPerDimension;
  const storageLimit = device.limits.maxStorageBufferBindingSize;
  if (
    Math.ceil(grid.count / OWNERSHIP_WORKGROUP_SIZE) > workgroupLimit ||
    tileCount > workgroupLimit || count > workgroupLimit ||
    Math.max(siteBytes, ownershipBytes, partialBytes, brightnessBytes) > storageLimit
  ) {
    throw new Error("Lloyd workload exceeds this WebGPU device's compute or storage limits.");
  }

  const buffers: GPUBuffer[] = [];
  const makeBuffer = (label: string, size: number, usage: GPUBufferUsageFlags) => {
    const buffer = device.createBuffer({ label, size, usage });
    buffers.push(buffer);
    return buffer;
  };
  try {
    const setupStartedAt = performance.now();
    const sites = [
      makeBuffer("Lloyd sites A", siteBytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC),
      makeBuffer("Lloyd sites B", siteBytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC),
    ];
    const owners = makeBuffer("Lloyd ownership", ownershipBytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const brightness = makeBuffer("Lloyd brightness", brightnessBytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const partials = makeBuffer("Lloyd partial sums", partialBytes, GPUBufferUsage.STORAGE);
    const config = makeBuffer("Lloyd config", 32, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const finalReadback = count > 0 && iterations > 0
      ? makeBuffer("Lloyd final sites readback", siteBytes, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
      : undefined;
    const beforeReadback = debugEnabled && count > 0 && iterations > 0
      ? makeBuffer("Lloyd before-final sites readback", siteBytes, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
      : undefined;
    const ownershipReadback = debugEnabled
      ? makeBuffer("Lloyd final ownership readback", ownershipBytes, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
      : undefined;
    const bufferSetupMs = performance.now() - setupStartedAt;

    const uploadStartedAt = performance.now();
    const packedSites = new Float32Array(count * 2);
    initialPoints.forEach((point, index) => {
      packedSites[2 * index] = point.x;
      packedSites[2 * index + 1] = point.y;
    });
    if (count > 0) device.queue.writeBuffer(sites[0], 0, packedSites);
    if (mode === "weighted") device.queue.writeBuffer(brightness, 0, intensity.values);
    device.queue.writeBuffer(config, 0, new Uint32Array([
      width, height, grid.columns, grid.count, count, SAMPLE_STEP, tileCount, mode === "weighted" ? 1 : 0,
    ]));
    const uploadEnqueueMs = performance.now() - uploadStartedAt;

    const ownershipBindings = sites.map((site) => device.createBindGroup({
      layout: ownershipPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: site } },
        { binding: 1, resource: { buffer: owners } },
        { binding: 2, resource: { buffer: config } },
      ],
    }));
    const partialBindings = device.createBindGroup({
      layout: pipelines.partial.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: owners } },
        { binding: 1, resource: { buffer: brightness } },
        { binding: 2, resource: { buffer: partials } },
        { binding: 3, resource: { buffer: config } },
      ],
    });
    const centroidBindings = sites.map((site, index) => device.createBindGroup({
      layout: pipelines.centroid.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: partials } },
        { binding: 1, resource: { buffer: site } },
        { binding: 2, resource: { buffer: sites[1 - index] } },
        { binding: 3, resource: { buffer: config } },
      ],
    }));

    const encoder = device.createCommandEncoder({ label: "Sampled Lloyd iterations" });
    let current = 0;
    let ownershipEncodingMs = 0;
    let partialEncodingMs = 0;
    let centroidEncodingMs = 0;
    const encodeOwnership = (siteIndex: number) => {
      const started = performance.now();
      const pass = encoder.beginComputePass();
      pass.setPipeline(ownershipPipeline);
      pass.setBindGroup(0, ownershipBindings[siteIndex]);
      pass.dispatchWorkgroups(Math.ceil(grid.count / OWNERSHIP_WORKGROUP_SIZE));
      pass.end();
      ownershipEncodingMs += performance.now() - started;
    };
    if (count > 0) {
      for (let iteration = 0; iteration < iterations; iteration += 1) {
        if (beforeReadback && iteration === iterations - 1) {
          encoder.copyBufferToBuffer(sites[current], 0, beforeReadback, 0, siteBytes);
        }
        encodeOwnership(current);
        const partialStarted = performance.now();
        const partialPass = encoder.beginComputePass();
        partialPass.setPipeline(pipelines.partial);
        partialPass.setBindGroup(0, partialBindings);
        partialPass.dispatchWorkgroups(tileCount, count);
        partialPass.end();
        partialEncodingMs += performance.now() - partialStarted;

        const centroidStarted = performance.now();
        const centroidPass = encoder.beginComputePass();
        centroidPass.setPipeline(pipelines.centroid);
        centroidPass.setBindGroup(0, centroidBindings[current]);
        centroidPass.dispatchWorkgroups(count);
        centroidPass.end();
        centroidEncodingMs += performance.now() - centroidStarted;
        current = 1 - current;
      }
      if (finalReadback) encoder.copyBufferToBuffer(sites[current], 0, finalReadback, 0, siteBytes);
    }
    if (ownershipReadback) {
      encodeOwnership(current);
      encoder.copyBufferToBuffer(owners, 0, ownershipReadback, 0, ownershipBytes);
    }
    abortIfRequested(signal);
    const submitStartedAt = performance.now();
    device.queue.submit([encoder.finish()]);
    const submissionMs = performance.now() - submitStartedAt;
    const completionStartedAt = performance.now();
    await device.queue.onSubmittedWorkDone();
    const gpuCompletionMs = performance.now() - completionStartedAt;
    abortIfRequested(signal);

    const readbackStartedAt = performance.now();
    const finalPoints = finalReadback ? await readPoints(finalReadback, count) : [...initialPoints];
    const finalReadbackMs = performance.now() - readbackStartedAt;
    const debugStartedAt = performance.now();
    const beforeFinalIteration = beforeReadback ? await readPoints(beforeReadback, count) : debugEnabled ? [...initialPoints] : undefined;
    let finalOwnership: Uint32Array | undefined;
    if (ownershipReadback) {
      await ownershipReadback.mapAsync(GPUMapMode.READ);
      finalOwnership = new Uint32Array(ownershipReadback.getMappedRange().slice(0));
      ownershipReadback.unmap();
    }
    const debugReadbackMs = performance.now() - debugStartedAt;
    return {
      finalPoints, beforeFinalIteration, finalOwnership,
      timings: {
        deviceAcquisitionMs: deviceHandle.initializationMs,
        pipelinePreparationMs, bufferSetupMs, uploadEnqueueMs,
        ownershipEncodingMs, partialEncodingMs, centroidEncodingMs,
        submissionMs, gpuCompletionMs, finalReadbackMs, debugReadbackMs,
        totalMs: performance.now() - startedAt,
        deviceReused: deviceHandle.reused,
        pipelinesReused: ownershipReused && reductionReused,
      },
    };
  } finally {
    for (const buffer of buffers) buffer.destroy();
  }
}
