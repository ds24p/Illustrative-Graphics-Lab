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

  adapterPromise ??= gpu.requestAdapter().then(
    (adapter) => {
      // A null result may be temporary (for example while the GPU resets).
      if (!adapter) adapterPromise = undefined;
      return adapter;
    },
    (error) => {
      adapterPromise = undefined;
      throw error;
    },
  );
  return adapterPromise;
}

export async function checkWebGpuAvailability(): Promise<BackendAvailability> {
  if (!getGpuApi()) {
    return {
      available: false,
      reason:
        typeof isSecureContext !== "undefined" && !isSecureContext
          ? "WebGPU requires a secure context (HTTPS or localhost)."
          : "WebGPU is unavailable in this browser.",
    };
  }

  try {
    const adapter = await requestAdapter();
    if (!adapter) {
      return {
        available: false,
        reason: "No compatible WebGPU adapter was returned by this browser.",
      };
    }
  } catch {
    return {
      available: false,
      reason: "The WebGPU adapter could not be initialized.",
    };
  }

  try {
    await getWebGpuDevice();
    return { available: true };
  } catch {
    return {
      available: false,
      reason: "The WebGPU device could not be initialized.",
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
        adapterPromise = undefined;
      });
      return device;
    })().catch((error) => {
      devicePromise = undefined;
      adapterPromise = undefined;
      throw error;
    });
  }

  return {
    device: await devicePromise,
    initializationMs: performance.now() - startedAt,
    reused,
  };
}
