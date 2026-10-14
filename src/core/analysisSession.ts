import type { AnalysisUpdate } from "./analyze";
import type { SourceFile } from "./types";

// A single bounded snapshot cache survives consecutive imports. A failure or
// parent-side deadline drops the worker and cache; the next request starts fresh.
export class AnalysisSession {
  private worker?: Worker;
  private cancel?: (error: Error) => void;
  private serial = 0;
  constructor(private createWorker: () => Worker) {}
  dispose() {
    const cancel = this.cancel;
    this.cancel = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    cancel?.(Error("Source analysis ended. Import again."));
  }
  request(files: SourceFile[], timeout = 20000): Promise<AnalysisUpdate> {
    if (this.cancel)
      return Promise.reject(Error("Source analysis is already running."));
    return new Promise((resolve, reject) => {
      const worker = (this.worker ??= this.createWorker());
      const id = ++this.serial;
      const finish = (error?: Error, result?: AnalysisUpdate) => {
        clearTimeout(timer);
        worker.onmessage = null;
        worker.onerror = null;
        this.cancel = undefined;
        if (error) {
          this.dispose();
          reject(error);
        } else resolve(result!);
      };
      const timer = setTimeout(
        () => finish(Error("Source analysis timed out. Try a smaller module.")),
        timeout,
      );
      this.cancel = (error) => finish(error);
      worker.onmessage = ({ data }) => {
        if (data.id === id)
          finish(data.error ? Error(data.error) : undefined, data.result);
      };
      worker.onerror = () =>
        finish(Error("Source analysis failed. Import again."));
      try {
        worker.postMessage({ id, files });
      } catch {
        finish(Error("Could not send source for analysis."));
      }
    });
  }
}
