import type {
  BackendAvailability,
  ExperimentBackend,
} from "./types";

export async function checkBackendAvailability(
  backend: ExperimentBackend,
): Promise<BackendAvailability> {
  if (
    backend.id === "webgpu" &&
    (typeof navigator === "undefined" || !("gpu" in navigator))
  ) {
    return {
      available: false,
      reason:
        typeof isSecureContext !== "undefined" && !isSecureContext
          ? "WebGPU requires a secure context (HTTPS or localhost)."
          : "WebGPU is unavailable in this browser.",
    };
  }

  try {
    return (await backend.checkAvailability?.()) ?? { available: true };
  } catch {
    return {
      available: false,
      reason: `${backend.id.toUpperCase()} could not be initialized.`,
    };
  }
}
