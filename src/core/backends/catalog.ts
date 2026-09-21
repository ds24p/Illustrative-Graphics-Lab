import type { BackendId } from "./types";

export interface BackendDescriptor {
  id: BackendId;
  label: string;
  shortLabel: string;
}

export const backendCatalog: Record<BackendId, BackendDescriptor> = {
  cpu: { id: "cpu", label: "CPU (TypeScript)", shortLabel: "CPU" },
  worker: { id: "worker", label: "Web Worker", shortLabel: "Worker" },
  webgpu: { id: "webgpu", label: "WebGPU", shortLabel: "WebGPU" },
};
