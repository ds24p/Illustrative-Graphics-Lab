import { executeStipplingWorkerRequest } from "./execute";
import type { StipplingWorkerRequest, StipplingWorkerResponse } from "./protocol";

const workerScope = self as unknown as {
  addEventListener: (type: "message", listener: (event: MessageEvent<StipplingWorkerRequest>) => void) => void;
  postMessage: (message: StipplingWorkerResponse, transfer?: Transferable[]) => void;
};

workerScope.addEventListener("message", (event) => {
  const request = event.data;
  try {
    const response = executeStipplingWorkerRequest(request);
    if (!response.ok) throw new Error("Unexpected Worker result.");
    workerScope.postMessage(response, [
      ...(response.intensity ? [response.intensity.values.buffer] : []),
      ...(response.task === "lloyd-sampled" && response.debugOwnership
        ? [response.debugOwnership.data.buffer] : []),
    ]);
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : "Stippling Worker failed.",
      },
    });
  }
});
