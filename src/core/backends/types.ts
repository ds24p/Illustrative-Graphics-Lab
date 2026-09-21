import type { ImageSource } from "../images/types";
import type { ExperimentParameters } from "../parameters/types";
import type { ExperimentOutput } from "../results/types";

export type BackendId = "cpu" | "worker" | "webgpu";

export interface ExperimentRunInput<TParameters extends ExperimentParameters> {
  source: ImageSource;
  parameters: TParameters;
  methodId: string;
  debugEnabled: boolean;
  signal?: AbortSignal;
}

export interface BackendOutput extends ExperimentOutput {
  stageTimings?: Record<string, number>;
}

export interface BackendAvailability {
  available: boolean;
  reason?: string;
}

export interface ExperimentBackend<
  TParameters extends ExperimentParameters = ExperimentParameters,
> {
  readonly id: BackendId;
  checkAvailability?: () => Promise<BackendAvailability>;
  run(input: ExperimentRunInput<TParameters>): Promise<BackendOutput>;
}

// A future WGSL implementation satisfies this interface without changing the UI.
export interface WebGpuExperimentBackend<
  TParameters extends ExperimentParameters = ExperimentParameters,
> extends ExperimentBackend<TParameters> {
  readonly id: "webgpu";
  readonly shaderSource: string;
}
