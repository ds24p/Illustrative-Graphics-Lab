import type { BackendAvailability } from "../backends/types";

let adapterPromise: Promise<GPUAdapter | null> | undefined;
let devicePromise: Promise<GPUDevice> | undefined;

function getGpuApi() {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return undefined;
  }

  return navigator.gpu;
}

function requestAdapter() {
  const gpu = getGpuApi();
  if (!gpu) return Promise.resolve(null);

  adapterPromise ??= gpu.requestAdapter().catch((error) => {
    adapterPromise = undefined;
    throw error;
  });
  return adapterPromise;
}

export async function checkWebGpuAvailability(): Promise<BackendAvailability> {
  if (!getGpuApi()) {
    return {
      available: false,
      reason: "WebGPU is unavailable in this browser.",
    };
  }

  try {
    const adapter = await requestAdapter();
    return adapter
      ? { available: true }
      : {
          available: false,
          reason: "No compatible WebGPU adapter was found.",
        };
  } catch {
    return {
      available: false,
      reason: "The WebGPU adapter could not be initialized.",
    };
  }
}

export interface WebGpuDeviceHandle {
  device: GPUDevice;
  initializationMs: number;
  reused: boolean;
}

export async function getWebGpuDevice(): Promise<WebGpuDeviceHandle> {
  const startedAt = performance.now();
  const reused = Boolean(devicePromise);

  if (!devicePromise) {
    devicePromise = (async () => {
      const adapter = await requestAdapter();
      if (!adapter) throw new Error("No compatible WebGPU adapter was found.");

      const device = await adapter.requestDevice();
      void device.lost.then(() => {
        devicePromise = undefined;
      });
      return device;
    })().catch((error) => {
      devicePromise = undefined;
      throw error;
    });
  }

  return {
    device: await devicePromise,
    initializationMs: performance.now() - startedAt,
    reused,
  };
}
