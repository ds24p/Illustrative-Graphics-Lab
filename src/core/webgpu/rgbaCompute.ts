import { getWebGpuDevice } from "./device";

export interface RgbaComputeRequest {
  label: string;
  shaderSource: string;
  imageData: ImageData;
  parameterData: ArrayBuffer;
  workgroupSize: readonly [number, number];
  additionalStorageInputs?: readonly RgbaComputeStorageInput[];
}

export interface RgbaComputeStorageInput {
  label: string;
  data: ArrayBufferView;
}

export interface RgbaComputeResult {
  imageData: ImageData;
  stageTimings: Record<string, number>;
}

// Shared buffer and readback path for pixel-independent RGBA compute shaders.
export async function runRgbaComputeShader({
  label,
  shaderSource,
  imageData,
  parameterData,
  workgroupSize,
  additionalStorageInputs = [],
}: RgbaComputeRequest): Promise<RgbaComputeResult> {
  const { width, height } = imageData;
  const byteLength = imageData.data.byteLength;
  const stageTimings: Record<string, number> = {};
  let inputBuffer: GPUBuffer | undefined;
  let outputBuffer: GPUBuffer | undefined;
  let parameterBuffer: GPUBuffer | undefined;
  let readbackBuffer: GPUBuffer | undefined;
  const additionalStorageBuffers: GPUBuffer[] = [];

  try {
    const setupStartedAt = performance.now();
    const deviceHandle = await getWebGpuDevice();
    const { device } = deviceHandle;
    const shaderModule = device.createShaderModule({
      label: `${label} shader`,
      code: shaderSource,
    });
    const pipeline = await device.createComputePipelineAsync({
      label: `${label} compute pipeline`,
      layout: "auto",
      compute: { module: shaderModule, entryPoint: "main" },
    });

    inputBuffer = device.createBuffer({
      label: `${label} input RGBA pixels`,
      size: byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    outputBuffer = device.createBuffer({
      label: `${label} output RGBA pixels`,
      size: byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    parameterBuffer = device.createBuffer({
      label: `${label} parameters`,
      size: parameterData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    readbackBuffer = device.createBuffer({
      label: `${label} readback`,
      size: byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    additionalStorageInputs.forEach((input) => {
      additionalStorageBuffers.push(
        device.createBuffer({
          label: `${label} ${input.label}`,
          size: Math.max(4, Math.ceil(input.data.byteLength / 4) * 4),
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }),
      );
    });
    const bindGroup = device.createBindGroup({
      label: `${label} bindings`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: parameterBuffer } },
        ...additionalStorageBuffers.map((buffer, index) => ({
          binding: index + 3,
          resource: { buffer },
        })),
      ],
    });
    const setupLabel = deviceHandle.reused
      ? "Initialization / setup (cached device)"
      : "Initialization / setup";
    stageTimings[setupLabel] = performance.now() - setupStartedAt;

    const uploadStartedAt = performance.now();
    device.queue.writeBuffer(inputBuffer, 0, imageData.data);
    device.queue.writeBuffer(parameterBuffer, 0, parameterData);
    additionalStorageInputs.forEach((input, index) => {
      const sourceBytes = new Uint8Array(
        input.data.buffer,
        input.data.byteOffset,
        input.data.byteLength,
      );
      const uploadBytes = new Uint8Array(sourceBytes);
      device.queue.writeBuffer(additionalStorageBuffers[index], 0, uploadBytes);
    });
    stageTimings["Upload / preparation"] = performance.now() - uploadStartedAt;

    const dispatchStartedAt = performance.now();
    const commandEncoder = device.createCommandEncoder({
      label: `${label} commands`,
    });
    const computePass = commandEncoder.beginComputePass({
      label: `${label} pass`,
    });
    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(
      Math.ceil(width / workgroupSize[0]),
      Math.ceil(height / workgroupSize[1]),
    );
    computePass.end();
    commandEncoder.copyBufferToBuffer(
      outputBuffer,
      0,
      readbackBuffer,
      0,
      byteLength,
    );
    device.queue.submit([commandEncoder.finish()]);
    stageTimings["Dispatch encoding / submission"] =
      performance.now() - dispatchStartedAt;

    const synchronizationStartedAt = performance.now();
    await readbackBuffer.mapAsync(GPUMapMode.READ);
    stageTimings["Synchronization (compute + copy)"] =
      performance.now() - synchronizationStartedAt;

    const readbackStartedAt = performance.now();
    const mappedBytes = readbackBuffer.getMappedRange();
    const pixels = new Uint8ClampedArray(mappedBytes.slice(0));
    readbackBuffer.unmap();
    const result = new ImageData(pixels, width, height);
    stageTimings["Readback / result conversion"] =
      performance.now() - readbackStartedAt;

    return { imageData: result, stageTimings };
  } finally {
    inputBuffer?.destroy();
    outputBuffer?.destroy();
    parameterBuffer?.destroy();
    readbackBuffer?.destroy();
    additionalStorageBuffers.forEach((buffer) => buffer.destroy());
  }
}
