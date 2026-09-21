import type { BackendId, ExperimentBackend } from "../backends/types";
import { checkBackendAvailability } from "../backends/availability";
import type { ExperimentDefinition } from "../experiments/types";
import type { ExperimentMethodDefinition } from "../experiments/types";
import { getExperimentMethod } from "../experiments/methods";
import type { ImageSource } from "../images/types";
import type { ExperimentParameters } from "../parameters/types";
import type { ExperimentRunReport } from "./types";

interface ResolvedBackend<TParameters extends ExperimentParameters> {
  backend: ExperimentBackend<TParameters>;
  fallbackReason?: string;
}

async function resolveBackend<TParameters extends ExperimentParameters>(
  method: ExperimentMethodDefinition<TParameters>,
  requestedBackend: BackendId,
): Promise<ResolvedBackend<TParameters>> {
  const requested = method.backends[requestedBackend];

  if (requested && method.supportedBackends.includes(requestedBackend)) {
    const availability = await checkBackendAvailability(requested);
    if (availability.available) {
      return { backend: requested };
    }

    const cpu = method.backends.cpu;
    if (cpu) {
      return {
        backend: cpu,
        fallbackReason: availability.reason ?? "The requested backend is unavailable.",
      };
    }
  }

  const cpu = method.backends.cpu;
  if (!cpu) {
    throw new Error(`No usable backend is registered for ${method.label}.`);
  }

  return {
    backend: cpu,
    fallbackReason:
      requestedBackend === "cpu"
        ? undefined
        : `${requestedBackend} is not implemented for this experiment.`,
  };
}

export async function runExperiment<TParameters extends ExperimentParameters>(
  experiment: ExperimentDefinition<TParameters>,
  methodId: string,
  source: ImageSource,
  parameters: TParameters,
  requestedBackend: BackendId,
  debugEnabled = false,
): Promise<ExperimentRunReport> {
  const totalStartedAt = performance.now();
  const method = getExperimentMethod(experiment, methodId);
  const { backend, fallbackReason } = await resolveBackend(
    method,
    requestedBackend,
  );
  const processingStartedAt = performance.now();
  const input = { source, parameters, methodId, debugEnabled };
  let usedBackend = backend;
  let runtimeFallbackReason = fallbackReason;
  let output;

  try {
    output = await backend.run(input);
  } catch (backendError) {
    const cpu = method.backends.cpu;
    if (backend.id === "cpu" || !cpu) throw backendError;

    const message =
      backendError instanceof Error ? backendError.message : "Unknown backend error";
    usedBackend = cpu;
    runtimeFallbackReason = `${backend.id.toUpperCase()} failed (${message}). CPU fallback was used.`;
    output = await cpu.run(input);
  }
  const processingFinishedAt = performance.now();

  return {
    output: output.output,
    debugViews: output.debugViews ?? [],
    requestedBackend,
    usedBackend: usedBackend.id,
    fallbackReason: runtimeFallbackReason,
    timing: {
      totalMs: performance.now() - totalStartedAt,
      processingMs: processingFinishedAt - processingStartedAt,
      stages: output.stageTimings,
    },
  };
}
