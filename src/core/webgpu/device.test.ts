import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockDevice() {
  return { lost: new Promise(() => {}) } as unknown as GPUDevice;
}

function mockAdapter(device = mockDevice()) {
  return {
    requestDevice: vi.fn().mockResolvedValue(device),
  } as unknown as GPUAdapter;
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("shared WebGPU availability", () => {
  it("retries after a null adapter rather than caching unavailability", async () => {
    const requestAdapter = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockAdapter());
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });
    const { checkWebGpuAvailability } = await import("./device");

    expect((await checkWebGpuAvailability()).available).toBe(false);
    expect((await checkWebGpuAvailability()).available).toBe(true);
    expect(requestAdapter).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight adapter request across simultaneous checks", async () => {
    let resolveAdapter!: (adapter: GPUAdapter) => void;
    const pending = new Promise<GPUAdapter>((resolve) => {
      resolveAdapter = resolve;
    });
    const requestAdapter = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });
    const { checkWebGpuAvailability } = await import("./device");

    const first = checkWebGpuAvailability();
    const second = checkWebGpuAvailability();
    expect(requestAdapter).toHaveBeenCalledTimes(1);
    resolveAdapter(mockAdapter());

    expect((await first).available).toBe(true);
    expect((await second).available).toBe(true);
    expect(requestAdapter).toHaveBeenCalledTimes(1);
  });

  it("reports device acquisition failure and allows a later retry", async () => {
    const failingAdapter = {
      requestDevice: vi.fn().mockRejectedValue(new Error("device unavailable")),
    } as unknown as GPUAdapter;
    const requestAdapter = vi.fn()
      .mockResolvedValueOnce(failingAdapter)
      .mockResolvedValueOnce(mockAdapter());
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });
    const { checkWebGpuAvailability } = await import("./device");

    expect(await checkWebGpuAvailability()).toEqual({
      available: false,
      reason: "The WebGPU device could not be initialized.",
    });
    expect((await checkWebGpuAvailability()).available).toBe(true);
    expect(requestAdapter).toHaveBeenCalledTimes(2);
  });

  it("requests a fresh adapter and device after device loss", async () => {
    let resolveLost!: (value: GPUDeviceLostInfo) => void;
    const firstDevice = {
      lost: new Promise<GPUDeviceLostInfo>((resolve) => {
        resolveLost = resolve;
      }),
    } as unknown as GPUDevice;
    const requestAdapter = vi.fn()
      .mockResolvedValueOnce(mockAdapter(firstDevice))
      .mockResolvedValueOnce(mockAdapter());
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });
    const { getWebGpuDevice } = await import("./device");

    expect((await getWebGpuDevice()).device).toBe(firstDevice);
    resolveLost({ reason: "unknown", message: "GPU reset" } as GPUDeviceLostInfo);
    await Promise.resolve();
    expect((await getWebGpuDevice()).device).not.toBe(firstDevice);
    expect(requestAdapter).toHaveBeenCalledTimes(2);
  });
});
