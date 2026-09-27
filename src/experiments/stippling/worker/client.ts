import type { StipplingWorkerResponse, WorkerRequestPayload } from "./protocol";

function abortError() {
  return new DOMException("Worker run was cancelled.", "AbortError");
}

interface PendingRun {
  resolve: (response: StipplingWorkerResponse) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  onAbort: () => void;
}

export class StipplingWorkerClient {
  private worker?: Worker;
  private nextId = 1;
  private pending = new Map<number, PendingRun>();

  constructor(private readonly createWorker: () => Worker) {}

  private onMessage = (event: MessageEvent<StipplingWorkerResponse>) => {
    const response = event.data;
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    pending.signal?.removeEventListener("abort", pending.onAbort);
    if (response.ok) {
      pending.resolve(response);
    } else {
      const error = new Error(response.error.message);
      error.name = response.error.name;
      pending.reject(error);
    }
  };

  private onError = () => {
    this.stop(new Error("The Stippling Worker failed during execution."));
  };

  private ensureWorker(): Worker {
    if (!this.worker) {
      const worker = this.createWorker();
      worker.addEventListener("message", this.onMessage);
      worker.addEventListener("error", this.onError);
      worker.addEventListener("messageerror", this.onError);
      this.worker = worker;
    }
    return this.worker;
  }

  private stop(error: Error): void {
    this.worker?.terminate();
    this.worker = undefined;
    for (const pending of this.pending.values()) {
      pending.signal?.removeEventListener("abort", pending.onAbort);
      pending.reject(error);
    }
    this.pending.clear();
  }

  async run(
    payload: WorkerRequestPayload,
    signal?: AbortSignal,
  ): Promise<StipplingWorkerResponse> {
    if (signal?.aborted) throw abortError();
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const onAbort = () => this.stop(abortError());
      this.pending.set(id, { resolve, reject, signal, onAbort });
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      try {
        // The Float32 intensity is newly derived from source pixels. Transfer
        // it without detaching ImageSource.imageData used by preview/reruns.
        worker.postMessage({ ...payload, id }, [payload.intensity.values.buffer]);
      } catch (error) {
        this.stop(error instanceof Error ? error : new Error("Worker message failed."));
      }
    });
  }

  dispose(): void {
    this.stop(abortError());
  }
}

export const stipplingWorkerClient = new StipplingWorkerClient(
  () => new Worker(new URL("./entry.ts", import.meta.url), { type: "module" }),
);
