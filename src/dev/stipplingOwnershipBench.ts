import { publicUrl } from "../core/assets/publicUrl";
import { createProcessingIntensity } from "../experiments/stippling/intensity";
import { initializeLloydPoints } from "../experiments/stippling/methods/lloyd/initialization";
import {
  cpuSampledOwnership,
  samplePosition,
  sampledGrid,
} from "../experiments/stippling/methods/lloyd/ownership";
import { computeSampledOwnershipWebGpu } from "../experiments/stippling/methods/lloyd/ownership.webgpu";
import type { PlacementPoint } from "../experiments/stippling/types";

const cases = {
  small: { width: 320, height: 240, sites: 50 },
  medium: { width: 800, height: 600, sites: 250 },
  realistic: { width: 1536, height: 1024, sites: 250 },
  heavier: { width: 1536, height: 1024, sites: 500 },
} as const;

type CaseId = keyof typeof cases;
const requestedCase = new URLSearchParams(location.search).get("case");
const caseId: CaseId = requestedCase && requestedCase in cases ? requestedCase as CaseId : "small";
const benchmarkCase = cases[caseId];
const button = document.querySelector<HTMLButtonElement>("#run")!;
const status = document.querySelector<HTMLElement>("#status")!;
const result = document.querySelector<HTMLElement>("#result")!;

async function initializedSites(width: number, height: number, count: number) {
  const image = new Image();
  image.src = publicUrl("samples/grayscale-still-life.png");
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable.");
  context.drawImage(image, 0, 0, width, height);
  const intensity = createProcessingIntensity(context.getImageData(0, 0, width, height));
  const initialized = initializeLloydPoints(intensity, {
    seed: 12345, initialPoints: count, maxAttempts: 10000,
  });
  return initialized.points;
}

function compareOwners(cpu: Uint32Array, gpu: Uint32Array, points: readonly PlacementPoint[], width: number, height: number) {
  if (cpu.length !== gpu.length) throw new Error("CPU and GPU sample counts differ.");
  const grid = sampledGrid(width, height);
  let different = 0;
  let nearBoundary = 0;
  let maxRelativeMargin = 0;
  for (let index = 0; index < cpu.length; index += 1) {
    if (cpu[index] === gpu[index]) continue;
    different += 1;
    const sample = samplePosition(index, grid);
    const distances = points.map((point) => {
      const dx = sample.x - point.x;
      const dy = sample.y - point.y;
      return dx * dx + dy * dy;
    }).sort((a, b) => a - b);
    const relativeMargin = distances.length > 1
      ? (distances[1] - distances[0]) / Math.max(1, distances[1])
      : 0;
    if (relativeMargin < 1e-5) nearBoundary += 1;
    maxRelativeMargin = Math.max(maxRelativeMargin, relativeMargin);
  }
  return {
    totalSamples: cpu.length,
    matchingOwners: cpu.length - different,
    differentOwners: different,
    disagreementPercent: 100 * different / cpu.length,
    disagreementsNearBoundary: nearBoundary,
    maxRelativeDistanceMarginAmongDisagreements: maxRelativeMargin,
  };
}

async function exactCases() {
  const examples = [
    { name: "empty", width: 7, height: 4, sites: [] },
    { name: "one site", width: 7, height: 4, sites: [{ x: 2, y: 1 }] },
    { name: "horizontal", width: 7, height: 4, sites: [{ x: 0, y: 0 }, { x: 6, y: 0 }] },
    { name: "vertical", width: 7, height: 4, sites: [{ x: 0, y: 0 }, { x: 0, y: 3 }] },
    { name: "integer tie", width: 4, height: 1, sites: [{ x: 0, y: 0 }, { x: 6, y: 0 }] },
    { name: "reversed tie", width: 4, height: 1, sites: [{ x: 6, y: 0 }, { x: 0, y: 0 }] },
    { name: "divisible", width: 6, height: 6, sites: [{ x: 0, y: 0 }, { x: 3, y: 3 }] },
    { name: "one pixel", width: 1, height: 1, sites: [{ x: 0, y: 0 }] },
  ];
  const results = [];
  for (const example of examples) {
    const cpu = cpuSampledOwnership(example.sites, example.width, example.height);
    const gpu = await computeSampledOwnershipWebGpu(example.sites, example.width, example.height);
    const equal = cpu.length === gpu.owners.length && cpu.every((value, index) => value === gpu.owners[index]);
    results.push({ name: example.name, equal, cpu: Array.from(cpu), gpu: Array.from(gpu.owners) });
  }
  return results;
}

async function floatBoundaryCase() {
  const sites = [{ x: 3 + 1e-8, y: 0 }, { x: 3, y: 0 }];
  const cpu = cpuSampledOwnership(sites, 4, 1);
  const gpu = (await computeSampledOwnershipWebGpu(sites, 4, 1)).owners;
  return {
    sample: { x: 3, y: 0 }, sites,
    cpuDistances: [(3 - sites[0].x) ** 2, (3 - sites[1].x) ** 2],
    uploadedF32X: sites.map((site) => Math.fround(site.x)),
    cpuOwner: cpu[1], gpuOwner: gpu[1],
  };
}

async function run() {
  button.disabled = true;
  status.textContent = `Preparing ${caseId} image and sites...`;
  result.textContent = "";
  try {
    const { width, height, sites: requestedSites } = benchmarkCase;
    const sites = await initializedSites(width, height, requestedSites);
    status.textContent = `Running CPU and GPU ownership: ${width} x ${height}, ${sites.length} sites...`;
    let cpu = cpuSampledOwnership(sites, width, height);
    const cpuRunsMs: number[] = [];
    for (let runIndex = 0; runIndex < 3; runIndex += 1) {
      const cpuStartedAt = performance.now();
      cpu = cpuSampledOwnership(sites, width, height);
      cpuRunsMs.push(performance.now() - cpuStartedAt);
    }
    const cpuMs = [...cpuRunsMs].sort((a, b) => a - b)[1];
    const cold = await computeSampledOwnershipWebGpu(sites, width, height);
    const warm = await computeSampledOwnershipWebGpu(sites, width, height);
    const repeated = await computeSampledOwnershipWebGpu(sites, width, height);
    const repeatIdentical = warm.owners.every((owner, index) => owner === repeated.owners[index]);
    const report = {
      caseId, width, height, requestedSites, acceptedSites: sites.length,
      sampleStep: 3, sampleCount: cpu.length,
      cpuOwnershipMedianMs: cpuMs,
      cpuOwnershipRunsMs: cpuRunsMs,
      cold: cold.timings,
      warm: warm.timings,
      repeatedWarm: repeated.timings,
      parity: compareOwners(cpu, warm.owners, sites, width, height),
      repeatIdentical,
      exactCases: await exactCases(),
      floatBoundary: await floatBoundaryCase(),
    };
    result.textContent = JSON.stringify(report, null, 2);
    status.textContent = "Complete";
  } catch (error) {
    status.textContent = "Failed";
    result.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", () => { void run(); });
