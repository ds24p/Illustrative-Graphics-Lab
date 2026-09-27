import type { LloydResult } from "../methods/lloyd/algorithm.cpu";
import type { IntensityImage, PoissonResult, StipplingParameters } from "../types";

interface RequestBase {
  id: number;
  intensity: IntensityImage;
  debugEnabled: boolean;
}

export interface PoissonWorkerRequest extends RequestBase {
  task: "poisson-exact";
  parameters: Pick<StipplingParameters, "seed" | "targetPoints" | "maxAttempts" | "poissonRadius" | "spacingMode">;
}

export interface LloydWorkerRequest extends RequestBase {
  task: "lloyd-sampled";
  parameters: Pick<StipplingParameters, "seed" | "initialPoints" | "maxAttempts" | "iterations" | "lloydMode" | "removeNearWhite">;
}

export type StipplingWorkerRequest = PoissonWorkerRequest | LloydWorkerRequest;
export type WorkerRequestPayload = Omit<PoissonWorkerRequest, "id"> | Omit<LloydWorkerRequest, "id">;

interface SuccessBase {
  id: number;
  ok: true;
  intensity?: IntensityImage;
  algorithmMs: number;
  debugMs: number;
}

export interface PoissonWorkerSuccess extends SuccessBase {
  task: "poisson-exact";
  result: PoissonResult;
}

export interface LloydWorkerSuccess extends SuccessBase {
  task: "lloyd-sampled";
  result: LloydResult;
  debugOwnership?: ImageData;
}

export interface WorkerFailure {
  id: number;
  ok: false;
  error: { name: string; message: string };
}

export type StipplingWorkerResponse = PoissonWorkerSuccess | LloydWorkerSuccess | WorkerFailure;
