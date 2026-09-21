import { describe, expect, it, vi } from "vitest";
import type { ExperimentBackend } from "../backends/types";
import type { ExperimentDefinition } from "../experiments/types";
import type { ImageSource } from "../images/types";
import { runExperiment } from "./runExperiment";

const pointOutput = {
  output: {
    kind: "points" as const,
    width: 1,
    height: 1,
    points: [],
  },
};

const source: ImageSource = {
  id: "test",
  name: "test",
  previewUrl: "",
  imageData: {} as ImageData,
};

function experimentWith(
  acceleratedBackend: ExperimentBackend,
): ExperimentDefinition {
  const cpu: ExperimentBackend = {
    id: "cpu",
    run: vi.fn(async () => pointOutput),
  };

  return {
    metadata: {
      id: "fallback-test",
      title: "Fallback test",
      summary: "",
      category: "Test",
      tags: [],
    },
    description: { overview: "", steps: [] },
    parameters: [],
    defaultParameters: {},
    sampleImages: [],
    defaultMethodId: "method",
    methods: [
      {
        id: "method",
        label: "Method",
        supportedBackends: ["cpu", acceleratedBackend.id],
        defaultBackend: "cpu",
        backends: { cpu, [acceleratedBackend.id]: acceleratedBackend },
      },
    ],
  };
}

describe("backend fallback", () => {
  it("uses CPU when the browser does not expose WebGPU", async () => {
    const webgpu: ExperimentBackend = {
      id: "webgpu",
      run: vi.fn(async () => pointOutput),
    };
    const report = await runExperiment(
      experimentWith(webgpu),
      "method",
      source,
      {},
      "webgpu",
    );

    expect(report.usedBackend).toBe("cpu");
    expect(report.fallbackReason).toContain("WebGPU is unavailable");
    expect(webgpu.run).not.toHaveBeenCalled();
  });

  it("uses CPU when an available accelerated backend fails at runtime", async () => {
    const worker: ExperimentBackend = {
      id: "worker",
      run: vi.fn(async () => {
        throw new Error("initialization failed");
      }),
    };
    const report = await runExperiment(
      experimentWith(worker),
      "method",
      source,
      {},
      "worker",
    );

    expect(report.usedBackend).toBe("cpu");
    expect(report.fallbackReason).toContain("initialization failed");
  });
});
