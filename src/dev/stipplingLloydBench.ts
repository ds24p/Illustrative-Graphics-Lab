import { publicUrl } from "../core/assets/publicUrl";
import { comparePointResults } from "../core/results/comparePointResults";
import type { ImageSource } from "../core/images/types";
import { stipplingExperiment } from "../experiments/stippling/experiment";
import { lloydIteration } from "../experiments/stippling/methods/lloyd/algorithm.cpu";
import { runSampledLloydWebGpu } from "../experiments/stippling/methods/lloyd/algorithm.webgpu";
import { lloydCpuBackend } from "../experiments/stippling/methods/lloyd/backend.cpu";
import { lloydWebGpuBackend } from "../experiments/stippling/methods/lloyd/backend.webgpu";
import { lloydWorkerBackend } from "../experiments/stippling/methods/lloyd/backend.worker";
import { cpuSampledOwnership } from "../experiments/stippling/methods/lloyd/ownership";
import type { IntensityImage, PlacementPoint, StipplingParameters } from "../experiments/stippling/types";

const cases = {
  small: { width: 320, height: 240, sites: 50, iterations: 3 },
  medium: { width: 800, height: 600, sites: 250, iterations: 3 },
  realistic: { width: 1536, height: 1024, sites: 250, iterations: 3 },
  heavier: { width: 1536, height: 1024, sites: 500, iterations: 5 },
} as const;
const query = new URLSearchParams(location.search);
const requestedCase = query.get("case");
const caseId = requestedCase && requestedCase in cases ? requestedCase as keyof typeof cases : "controls";
const mode: "unweighted" | "weighted" = query.get("mode") === "unweighted" ? "unweighted" : "weighted";
const button = document.querySelector<HTMLButtonElement>("#run")!;
const status = document.querySelector<HTMLElement>("#status")!;
const result = document.querySelector<HTMLElement>("#result")!;

const image = (width: number, height: number, values: number[]): IntensityImage => ({
  width, height, values: new Float32Array(values),
});

function cpuIterations(sites: PlacementPoint[], intensity: IntensityImage, iterations: number, selectedMode: typeof mode) {
  let current = sites;
  for (let index = 0; index < iterations; index += 1) {
    current = lloydIteration(current, intensity, selectedMode);
  }
  return current;
}

async function controlledCases() {
  const casesToCheck: Array<{
    name: string; intensity: IntensityImage; sites: PlacementPoint[];
    iterations: number; mode: typeof mode; expected?: PlacementPoint[];
  }> = [
    { name: "one site unweighted", intensity: image(7, 7, Array(49).fill(0)), sites: [{ x: 0, y: 0 }],
      iterations: 1, mode: "unweighted", expected: [{ x: 3, y: 3 }] },
    { name: "uniform black weighted", intensity: image(7, 7, Array(49).fill(0)), sites: [{ x: 0, y: 0 }],
      iterations: 1, mode: "weighted", expected: [{ x: 3, y: 3 }] },
    { name: "uniform white zero weight", intensity: image(7, 1, Array(7).fill(1)), sites: [{ x: 1.25, y: 0 }],
      iterations: 1, mode: "weighted", expected: [{ x: 1.25, y: 0 }] },
    { name: "horizontal gradient", intensity: image(7, 1, [0, 0, 0, 0.5, 0, 0, 1]), sites: [{ x: 0, y: 0 }],
      iterations: 1, mode: "weighted", expected: [{ x: 1, y: 0 }] },
    { name: "asymmetric weights", intensity: image(7, 1, [0, 1, 1, 0.5, 1, 1, 0.75]), sites: [{ x: 0, y: 0 }],
      iterations: 1, mode: "weighted", expected: [{ x: 3 / 1.75, y: 0 }] },
    ...([0, 1, 2, 4] as const).map((iterations) => ({
      name: `${iterations} iterations`, intensity: image(10, 1, Array(10).fill(0)),
      sites: [{ x: 0, y: 0 }, { x: 3, y: 0 }], iterations, mode: "unweighted" as const,
    })),
    { name: "no sites", intensity: image(7, 4, Array(28).fill(0)), sites: [],
      iterations: 2, mode: "unweighted" },
  ];
  const reports = [];
  for (const item of casesToCheck) {
    const cpu = cpuIterations(item.sites, item.intensity, item.iterations, item.mode);
    const gpu = await runSampledLloydWebGpu(item.sites, item.intensity, item.iterations, item.mode, true);
    const matches = cpu.length === gpu.finalPoints.length && cpu.every((point, index) =>
      Math.hypot(point.x - gpu.finalPoints[index].x, point.y - gpu.finalPoints[index].y) < 1e-4);
    const expectedMatches = !item.expected || item.expected.every((point, index) =>
      Math.hypot(point.x - cpu[index].x, point.y - cpu[index].y) < 1e-8 &&
      Math.hypot(point.x - gpu.finalPoints[index].x, point.y - gpu.finalPoints[index].y) < 1e-4);
    const cpuOwners = cpuSampledOwnership(gpu.finalPoints, item.intensity.width, item.intensity.height);
    const ownershipMatches = gpu.finalOwnership?.length === cpuOwners.length &&
      cpuOwners.every((owner, index) => owner === gpu.finalOwnership![index]);
    reports.push({
      name: item.name, matches, expectedMatches, ownershipMatches,
      cpu, gpu: gpu.finalPoints, beforeFinalIteration: gpu.beforeFinalIteration,
    });
  }
  const tie = await runSampledLloydWebGpu(
    [{ x: 0, y: 0 }, { x: 6, y: 0 }], image(4, 1, Array(4).fill(0)), 0, "unweighted", true,
  );
  reports.push({ name: "exact ownership tie", matches: tie.finalOwnership?.[1] === 0,
    expectedMatches: true, ownershipMatches: true, cpu: [0], gpu: [tie.finalOwnership?.[1]] });
  const filteredPixels = new Uint8ClampedArray(Array.from({ length: 7 }, (_, x) => {
    const value = x === 0 || x === 6 ? 0 : 255;
    return [value, value, value, 255];
  }).flat());
  const filterSource: ImageSource = {
    id: "filter", name: "filter", previewUrl: "",
    imageData: new ImageData(filteredPixels, 7, 1),
  };
  const filterParameters: StipplingParameters = {
    ...stipplingExperiment.defaultParameters,
    seed: 12345, initialPoints: 1, maxAttempts: 10000,
    iterations: 1, lloydMode: "weighted", removeNearWhite: true,
  };
  const filterInput = { source: filterSource, parameters: filterParameters, methodId: "lloyd", debugEnabled: false };
  const cpuFilter = await lloydCpuBackend.run(filterInput);
  const gpuFilter = await lloydWebGpuBackend.run(filterInput);
  reports.push({ name: "post-movement near-white filter",
    matches: cpuFilter.output.kind === "points" && gpuFilter.output.kind === "points" &&
      cpuFilter.output.points.length === 0 && gpuFilter.output.points.length === 0,
    expectedMatches: true, ownershipMatches: true, cpu: cpuFilter.statistics, gpu: gpuFilter.statistics });
  return reports;
}

async function createSource(width: number, height: number): Promise<ImageSource> {
  const sample = new Image();
  sample.src = publicUrl("samples/grayscale-still-life.png");
  await sample.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable.");
  context.drawImage(sample, 0, 0, width, height);
  return { id: "bench", name: "bench", previewUrl: "", imageData: context.getImageData(0, 0, width, height) };
}

async function timed<T>(run: () => Promise<T>) {
  const started = performance.now();
  const output = await run();
  return { output, ms: performance.now() - started };
}

async function benchmark() {
  if (caseId === "controls") return { controlled: await controlledCases() };
  const selected = cases[caseId];
  const source = await createSource(selected.width, selected.height);
  const parameters: StipplingParameters = {
    ...stipplingExperiment.defaultParameters,
    seed: 12345, initialPoints: selected.sites, maxAttempts: 10000,
    iterations: selected.iterations, lloydMode: mode, removeNearWhite: true, dotSize: 4,
  };
  const input = { source, parameters, methodId: "lloyd", debugEnabled: false };
  status.textContent = "Running CPU...";
  const cpu = await timed(() => lloydCpuBackend.run(input));
  status.textContent = "Running Worker...";
  const worker = await timed(() => lloydWorkerBackend.run(input));
  status.textContent = "Running WebGPU cold...";
  const cold = await timed(() => lloydWebGpuBackend.run(input));
  status.textContent = "Running WebGPU warm...";
  const warm = await timed(() => lloydWebGpuBackend.run(input));
  status.textContent = "Running WebGPU debug...";
  const debug = await timed(() => lloydWebGpuBackend.run({ ...input, debugEnabled: true }));
  const filteredCount = (statistics: typeof cpu.output.statistics) =>
    statistics?.find((statistic) => statistic.label === "Filtered points")?.value ?? "0";
  return {
    caseId, mode, width: selected.width, height: selected.height,
    requestedSites: selected.sites, iterations: selected.iterations,
    cpuMs: cpu.ms, workerMs: worker.ms, gpuColdMs: cold.ms, gpuWarmMs: warm.ms,
    gpuDebugMs: debug.ms,
    gpuColdStages: cold.output.stageTimings,
    gpuWarmStages: warm.output.stageTimings,
    gpuDebugStages: debug.output.stageTimings,
    cpuWorker: comparePointResults(cpu.output.output, worker.output.output),
    cpuGpu: comparePointResults(cpu.output.output, warm.output.output),
    gpuRepeat: comparePointResults(cold.output.output, warm.output.output),
    gpuDebugRepeat: comparePointResults(warm.output.output, debug.output.output),
    filteredCounts: {
      cpu: filteredCount(cpu.output.statistics),
      worker: filteredCount(worker.output.statistics),
      gpu: filteredCount(warm.output.statistics),
    },
    debugViews: debug.output.debugViews?.map((view) => view.id),
  };
}

button.addEventListener("click", () => {
  button.disabled = true;
  status.textContent = "Running...";
  result.textContent = "";
  void benchmark().then((report) => {
    result.textContent = JSON.stringify(report, null, 2);
    status.textContent = "Complete";
  }).catch((error) => {
    result.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    status.textContent = "Failed";
  }).finally(() => { button.disabled = false; });
});
