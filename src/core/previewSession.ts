import type { InteractiveSnapshot } from "./interactivePreview";

// Serialize events so quick clicks cannot race a React commit. Each request has
// a parent-side deadline, including when imported code blocks the worker.
export class PreviewSession {
  private serial = 0;
  private ended = false;
  private queued = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private cancel?: (error: Error) => void;
  constructor(private worker: Worker) {}
  dispose() {
    if (this.ended) return;
    this.ended = true;
    this.worker.terminate();
    this.cancel?.(Error("Preview session ended. Render again."));
  }
  request(data: Record<string, unknown>): Promise<InteractiveSnapshot> {
    if (this.ended)
      return Promise.reject(Error("Preview session ended. Render again."));
    if (++this.queued > 20) {
      this.queued--;
      return Promise.reject(
        Error("Too many queued interactions. Render again."),
      );
    }
    const task = this.tail
      .then(
        () =>
          new Promise<InteractiveSnapshot>((resolve, reject) => {
            if (this.ended) {
              reject(Error("Preview session ended. Render again."));
              return;
            }
            const id = ++this.serial;
            const finish = (error?: Error, result?: InteractiveSnapshot) => {
              clearTimeout(timer);
              this.worker.onmessage = null;
              this.worker.onerror = null;
              this.cancel = undefined;
              if (error) {
                this.dispose();
                reject(error);
              } else resolve(result!);
            };
            const timer = setTimeout(
              () => finish(Error("Preview timed out. Render again.")),
              data.kind === "start" ? 15000 : 5000,
            );
            this.cancel = (error) => finish(error);
            this.worker.onmessage = ({ data: reply }) => {
              if (reply.id !== id) return;
              finish(
                reply.error ? Error(reply.error) : undefined,
                reply.result,
              );
            };
            this.worker.onerror = () =>
              finish(Error("Preview worker failed. Render again."));
            try {
              this.worker.postMessage({ ...data, id });
            } catch {
              finish(Error("Could not send the preview request."));
            }
          }),
      )
      .finally(() => {
        this.queued--;
      });
    this.tail = task.catch(() => undefined);
    return task;
  }
}
