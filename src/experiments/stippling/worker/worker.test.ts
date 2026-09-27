import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageSource } from "../../../core/images/types";
import { getMethodSupportedBackends } from "../../../core/experiments/methods";
import { runExperiment } from "../../../core/execution/runExperiment";
import { stipplingExperiment } from "../experiment";
import { createProcessingIntensity } from "../intensity";
import { placePoissonStipples } from "../methods/poisson/algorithm.cpu";
import { relaxLloyd } from "../methods/lloyd/algorithm.cpu";
import { stipplingWorkerClient, StipplingWorkerClient } from "./client";
import { executeStipplingWorkerRequest } from "./execute";
import type { StipplingWorkerRequest, StipplingWorkerResponse } from "./protocol";

class TestImageData {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}

class AlgorithmWorker {
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  terminated = false;

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  postMessage(request: StipplingWorkerRequest, transfers: Transferable[]) {
    const transferred = structuredClone(request, { transfer: transfers });
    queueMicrotask(() => {
      if (this.terminated) return;
      const response = executeStipplingWorkerRequest(transferred);
      this.emit("message", { data: response } as MessageEvent);
    });
  }

  emit(type: string, event: MessageEvent) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  terminate() { this.terminated = true; }
}

function source(): ImageSource {
  const width = 13;
  const height = 11;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = (x * 19 + y * 11) % 220;
      data.set([value, Math.floor(value / 2), 210 - value, 255], offset);
    }
  }
  return { id: "synthetic", name: "synthetic", previewUrl: "", imageData: new TestImageData(data, width, height) as ImageData };
}

const base = stipplingExperiment.defaultParameters;

beforeEach(() => {
  vi.stubGlobal("ImageData", TestImageData);
  vi.stubGlobal("Worker", AlgorithmWorker);
});

afterEach(() => {
  stipplingWorkerClient.dispose();
  vi.unstubAllGlobals();
});

describe("Stippling Worker parity", () => {
  it.each(["adaptive", "uniform"] as const)("matches Poisson Exact %s, including internal radii", async (spacingMode) => {
    const input = source();
    const untouched = Array.from(input.imageData.data);
    const parameters = { ...base, spacingCheck: "exact" as const, spacingMode, targetPoints: 8, maxAttempts: 100, poissonRadius: 0.7 };
    const intensity = createProcessingIntensity(input.imageData);
    const direct = placePoissonStipples(intensity, parameters);
    const response = executeStipplingWorkerRequest({ id: 1, task: "poisson-exact", intensity, parameters, debugEnabled: true });
    expect(response.ok && response.task === "poisson-exact" ? response.result : undefined).toEqual(direct);

    const cpu = await runExperiment(stipplingExperiment, "poisson", input, parameters, "cpu", true);
    const worker = await runExperiment(stipplingExperiment, "poisson", input, parameters, "worker", true);
    expect(worker.usedBackend).toBe("worker");
    expect(worker.output).toEqual(cpu.output);
    expect(worker.statistics).toEqual(cpu.statistics);
    expect(worker.debugViews).toEqual(cpu.debugViews);
    expect(Array.from(input.imageData.data)).toEqual(untouched);
    expect(worker.timing.stages?.["Worker algorithm"]).toBeGreaterThanOrEqual(0);
  });

  it.each([
    { lloydMode: "unweighted" as const, iterations: 0, removeNearWhite: false },
    { lloydMode: "unweighted" as const, iterations: 1, removeNearWhite: false },
    { lloydMode: "weighted" as const, iterations: 1, removeNearWhite: true },
    { lloydMode: "weighted" as const, iterations: 3, removeNearWhite: true },
  ])("matches sampled Lloyd $lloydMode at $iterations iterations", async ({ lloydMode, iterations, removeNearWhite }) => {
    const input = source();
    const parameters = { ...base, initialPoints: 6, maxAttempts: 100, lloydMode, iterations, removeNearWhite };
    const intensity = createProcessingIntensity(input.imageData);
    const direct = relaxLloyd(intensity, parameters);
    const response = executeStipplingWorkerRequest({ id: 1, task: "lloyd-sampled", intensity, parameters, debugEnabled: true });
    expect(response.ok && response.task === "lloyd-sampled" ? response.result : undefined).toEqual(direct);

    const cpu = await runExperiment(stipplingExperiment, "lloyd", input, parameters, "cpu", true);
    const worker = await runExperiment(stipplingExperiment, "lloyd", input, parameters, "worker", true);
    expect(worker.usedBackend).toBe("worker");
    expect(worker.output).toEqual(cpu.output);
    expect(worker.statistics).toEqual(cpu.statistics);
    expect(worker.debugViews).toEqual(cpu.debugViews);
    const withoutDebug = await runExperiment(stipplingExperiment, "lloyd", input, parameters, "worker", false);
    expect(withoutDebug.output).toEqual(worker.output);
    expect(withoutDebug.debugViews).toEqual([]);
  });

  it("exposes accelerated backends only for their sampled reference strategies", () => {
    const poisson = stipplingExperiment.methods.find(({ id }) => id === "poisson")!;
    const lloyd = stipplingExperiment.methods.find(({ id }) => id === "lloyd")!;
    const placement = stipplingExperiment.methods.find(({ id }) => id === "placement")!;
    expect(getMethodSupportedBackends(poisson, { ...base, spacingCheck: "exact" })).toEqual(["cpu", "worker"]);
    expect(getMethodSupportedBackends(poisson, { ...base, spacingCheck: "historical-occupancy" })).toEqual(["cpu"]);
    expect(getMethodSupportedBackends(lloyd, { ...base, lloydMode: "weighted" })).toEqual(["cpu", "worker", "webgpu"]);
    expect(getMethodSupportedBackends(lloyd, { ...base, lloydMode: "unweighted" })).toEqual(["cpu", "worker", "webgpu"]);
    expect(getMethodSupportedBackends(lloyd, { ...base, lloydMode: "historical-cone" })).toEqual(["cpu"]);
    expect(getMethodSupportedBackends(placement, base)).toEqual(["cpu"]);
  });

  it("falls back to the same CPU algorithm on Worker runtime failure", async () => {
    class BrokenWorker extends AlgorithmWorker {
      postMessage() { throw new Error("Synthetic postMessage failure"); }
    }
    vi.stubGlobal("Worker", BrokenWorker);
    const input = source();
    const parameters = { ...base, spacingCheck: "exact" as const, targetPoints: 8, maxAttempts: 100, poissonRadius: 0.7 };
    const cpu = await runExperiment(stipplingExperiment, "poisson", input, parameters, "cpu");
    const fallback = await runExperiment(stipplingExperiment, "poisson", input, parameters, "worker");
    expect(fallback.requestedBackend).toBe("worker");
    expect(fallback.usedBackend).toBe("cpu");
    expect(fallback.fallbackReason).toContain("Synthetic postMessage failure");
    expect(fallback.output).toEqual(cpu.output);
  });
});

describe("Worker client lifecycle", () => {
  const payload = () => ({
    task: "poisson-exact" as const,
    intensity: createProcessingIntensity(source().imageData),
    parameters: { ...base, spacingMode: "uniform" as const },
    debugEnabled: false,
  });

  it("routes out-of-order replies by request ID", async () => {
    class ManualWorker extends AlgorithmWorker {
      requests: StipplingWorkerRequest[] = [];
      postMessage(request: StipplingWorkerRequest) { this.requests.push(request); }
      reply(index: number) {
        const request = this.requests[index];
        this.emit("message", { data: executeStipplingWorkerRequest(request) } as MessageEvent);
      }
    }
    const worker = new ManualWorker();
    const client = new StipplingWorkerClient(() => worker as unknown as Worker);
    const first = client.run(payload());
    const second = client.run(payload());
    worker.reply(1);
    worker.reply(0);
    expect((await first).id).toBe(1);
    expect((await second).id).toBe(2);
    client.dispose();
    expect(worker.terminated).toBe(true);
  });

  it("terminates on cancellation and can create a fresh Worker", async () => {
    const workers: AlgorithmWorker[] = [];
    const client = new StipplingWorkerClient(() => {
      const worker = new AlgorithmWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    });
    const controller = new AbortController();
    const cancelled = client.run(payload(), controller.signal);
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    expect(workers[0].terminated).toBe(true);
    await expect(client.run(payload())).resolves.toMatchObject({ ok: true });
    expect(workers).toHaveLength(2);
    client.dispose();
  });

  it("turns Worker failures into controlled errors", async () => {
    class FailingWorker extends AlgorithmWorker {
      postMessage(request: StipplingWorkerRequest) {
        const failure: StipplingWorkerResponse = { id: request.id, ok: false, error: { name: "RangeError", message: "Synthetic failure" } };
        queueMicrotask(() => this.emit("message", { data: failure } as MessageEvent));
      }
    }
    const client = new StipplingWorkerClient(() => new FailingWorker() as unknown as Worker);
    await expect(client.run(payload())).rejects.toMatchObject({ name: "RangeError", message: "Synthetic failure" });
    client.dispose();
  });
});
