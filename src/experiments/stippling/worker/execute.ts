import { placePoissonStipples } from "../methods/poisson/algorithm.cpu";
import { relaxLloyd } from "../methods/lloyd/algorithm.cpu";
import { ownershipRaster } from "../methods/lloyd/debug";
import type { StipplingWorkerRequest, StipplingWorkerResponse } from "./protocol";

export function executeStipplingWorkerRequest(
  request: StipplingWorkerRequest,
): StipplingWorkerResponse {
  const startedAt = performance.now();
  if (request.task === "poisson-exact") {
    const result = placePoissonStipples(request.intensity, request.parameters);
    return {
      id: request.id, ok: true, task: request.task,
      intensity: request.debugEnabled ? request.intensity : undefined, result,
      algorithmMs: performance.now() - startedAt, debugMs: 0,
    };
  }

  const result = relaxLloyd(request.intensity, request.parameters);
  const algorithmMs = performance.now() - startedAt;
  const debugStartedAt = performance.now();
  const debugOwnership = request.debugEnabled
    ? ownershipRaster(result.finalPoints, request.intensity.width, request.intensity.height).imageData
    : undefined;
  return {
    id: request.id, ok: true, task: request.task,
    intensity: request.debugEnabled ? request.intensity : undefined, result, algorithmMs,
    debugMs: performance.now() - debugStartedAt, debugOwnership,
  };
}
