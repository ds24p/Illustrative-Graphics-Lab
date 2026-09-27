import { getWebGpuDevice } from "../../../../core/webgpu/device";
import type { PlacementPoint } from "../../types";
import { SAMPLE_STEP } from "./algorithm.cpu";
import { sampledGrid, type SampleGrid } from "./ownership";
import shaderSource from "./ownership.wgsl?raw";

export const OWNERSHIP_WORKGROUP_SIZE = 128;

export interface OwnershipPrototypeTimings {
  deviceAcquisitionMs: number;
  pipelineCreationMs: number;
  bufferSetupMs: number;
  pointPreparationMs: number;
  pointUploadMs: number;
  configUploadMs: number;
  computeSubmitMs: number;
  computeCompletionWaitMs: number;
  readbackMs: number;
  totalMs: number;
  deviceReused: boolean;
  pipelineReused: boolean;
}

export interface OwnershipPrototypeResult {
  owners: Uint32Array;
  grid: SampleGrid;
  timings: OwnershipPrototypeTimings;
}

const pipelines = new WeakMap<GPUDevice, Promise<GPUComputePipeline>>();

export async function getOwnershipPipeline(device: GPUDevice) {
  let pipeline = pipelines.get(device);
  const reused = Boolean(pipeline);
  if (!pipeline) {
    pipeline = device.createComputePipelineAsync({
      label: "Sampled Lloyd ownership",
      layout: "auto",
      compute: {
        module: device.createShaderModule({
          label: "Sampled Lloyd ownership shader",
          code: shaderSource,
        }),
        entryPoint: "main",
      },
    });
    pipelines.set(device, pipeline);
    void pipeline.catch(() => pipelines.delete(device));
  }
  return { pipeline: await pipeline, reused };
}

// Diagnostic ownership-only entry point; the full backend reuses this pipeline.
export async function computeSampledOwnershipWebGpu(
  points: readonly PlacementPoint[],
  width: number,
  height: number,
): Promise<OwnershipPrototypeResult> {
  const totalStartedAt = performance.now();
  const grid = sampledGrid(width, height);
  if (points.length >= 0xffff_ffff || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new Error("Ownership sites must have finite coordinates and valid indices.");
  }

  const deviceHandle = await getWebGpuDevice();
  const { device } = deviceHandle;
  const pipelineStartedAt = performance.now();
  const { pipeline, reused: pipelineReused } = await getOwnershipPipeline(device);
  const pipelineCreationMs = performance.now() - pipelineStartedAt;

  const preparationStartedAt = performance.now();
  const packedPoints = new Float32Array(points.length * 2);
  points.forEach((point, index) => {
    packedPoints[index * 2] = point.x;
    packedPoints[index * 2 + 1] = point.y;
  });
  const pointPreparationMs = performance.now() - preparationStartedAt;

  let pointBuffer: GPUBuffer | undefined;
  let ownershipBuffer: GPUBuffer | undefined;
  let configBuffer: GPUBuffer | undefined;
  let readbackBuffer: GPUBuffer | undefined;
  try {
    const setupStartedAt = performance.now();
    const ownershipBytes = grid.count * Uint32Array.BYTES_PER_ELEMENT;
    pointBuffer = device.createBuffer({
      label: "Lloyd prototype sites",
      size: Math.max(8, packedPoints.byteLength),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    ownershipBuffer = device.createBuffer({
      label: "Lloyd prototype ownership",
      size: ownershipBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    configBuffer = device.createBuffer({
      label: "Lloyd prototype config",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    readbackBuffer = device.createBuffer({
      label: "Lloyd prototype readback",
      size: ownershipBytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const bindGroup = device.createBindGroup({
      label: "Lloyd prototype bindings",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pointBuffer } },
        { binding: 1, resource: { buffer: ownershipBuffer } },
        { binding: 2, resource: { buffer: configBuffer } },
      ],
    });
    const bufferSetupMs = performance.now() - setupStartedAt;

    const pointUploadStartedAt = performance.now();
    if (packedPoints.length > 0) device.queue.writeBuffer(pointBuffer, 0, packedPoints);
    const pointUploadMs = performance.now() - pointUploadStartedAt;
    const configUploadStartedAt = performance.now();
    device.queue.writeBuffer(configBuffer, 0, new Uint32Array([
      width, height, grid.columns, grid.count, points.length, SAMPLE_STEP, 0, 0,
    ]));
    const configUploadMs = performance.now() - configUploadStartedAt;

    const computeSubmitStartedAt = performance.now();
    const computeEncoder = device.createCommandEncoder({ label: "Lloyd ownership compute" });
    const pass = computeEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(grid.count / OWNERSHIP_WORKGROUP_SIZE));
    pass.end();
    device.queue.submit([computeEncoder.finish()]);
    const computeSubmitMs = performance.now() - computeSubmitStartedAt;

    const completionStartedAt = performance.now();
    await device.queue.onSubmittedWorkDone();
    const computeCompletionWaitMs = performance.now() - completionStartedAt;

    // Separate submission makes readback cost visible, at the expense of one
    // extra synchronization compared with an optimized production pipeline.
    const readbackStartedAt = performance.now();
    const copyEncoder = device.createCommandEncoder({ label: "Lloyd ownership readback" });
    copyEncoder.copyBufferToBuffer(ownershipBuffer, 0, readbackBuffer, 0, ownershipBytes);
    device.queue.submit([copyEncoder.finish()]);
    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const owners = new Uint32Array(readbackBuffer.getMappedRange().slice(0));
    readbackBuffer.unmap();
    const readbackMs = performance.now() - readbackStartedAt;

    return {
      owners,
      grid,
      timings: {
        deviceAcquisitionMs: deviceHandle.initializationMs,
        pipelineCreationMs,
        bufferSetupMs,
        pointPreparationMs,
        pointUploadMs,
        configUploadMs,
        computeSubmitMs,
        computeCompletionWaitMs,
        readbackMs,
        totalMs: performance.now() - totalStartedAt,
        deviceReused: deviceHandle.reused,
        pipelineReused,
      },
    };
  } finally {
    pointBuffer?.destroy();
    ownershipBuffer?.destroy();
    configBuffer?.destroy();
    readbackBuffer?.destroy();
  }
}
