import type { BackendId } from "./types";

export interface BackendDescriptor {
  id: BackendId;
  label: string;
  shortLabel: string;
  description: string;
  timingNote: string;
}

export const backendCatalog: Record<BackendId, BackendDescriptor> = {
  cpu: {
    id: "cpu", label: "CPU (TypeScript)", shortLabel: "CPU",
    description: "Reference TypeScript on the browser main thread; a long run may pause interaction.",
    timingNote: "Wall-clock backend work, including preparation and result assembly; canvas drawing is excluded.",
  },
  worker: {
    id: "worker", label: "Web Worker", shortLabel: "Worker",
    description: "The same CPU algorithm off the main thread. Controls stay responsive; messaging adds overhead.",
    timingNote: "Wall-clock backend work includes Worker messaging and scheduling, not just algorithm time.",
  },
  webgpu: {
    id: "webgpu", label: "WebGPU", shortLabel: "WebGPU",
    description: "WGSL compute on the GPU. Setup and transfer costs may outweigh parallel work on small inputs.",
    timingNote: "Command encoding/submission is CPU-side; GPU completion includes queued transfers, compute, and copies.",
  },
};
