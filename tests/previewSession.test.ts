import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewSession } from "../src/core/previewSession";

function setup() {
  const worker = {
    onmessage: null as null | ((e: { data: unknown }) => void),
    onerror: null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
  return { worker, session: new PreviewSession(worker as unknown as Worker) };
}
afterEach(() => vi.useRealTimers());
describe("preview worker lifecycle", () => {
  it("serializes quick interactions and ignores replies from other requests", async () => {
    const { worker, session } = setup();
    const first = session.request({ kind: "event" }),
      second = session.request({ kind: "event" });
    await Promise.resolve();
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    worker.onmessage!({ data: { id: 99, result: { html: "wrong" } } });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    worker.onmessage!({ data: { id: 1, result: { html: "first" } } });
    expect((await first).html).toBe("first");
    await Promise.resolve();
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    worker.onmessage!({ data: { id: 2, result: { html: "second" } } });
    expect((await second).html).toBe("second");
    session.dispose();
  });
  it("terminates a stalled worker and rejects queued requests", async () => {
    vi.useFakeTimers();
    const { worker, session } = setup();
    const first = expect(session.request({ kind: "event" })).rejects.toThrow(
      "timed out",
    );
    const second = expect(session.request({ kind: "event" })).rejects.toThrow(
      "ended",
    );
    await vi.advanceTimersByTimeAsync(5001);
    await first;
    await second;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
  it("cancels pending requests on unmount or source changes", async () => {
    const { worker, session } = setup();
    const pending = expect(session.request({ kind: "start" })).rejects.toThrow(
      "ended",
    );
    await Promise.resolve();
    session.dispose();
    await pending;
    expect(worker.onmessage).toBeNull();
    await expect(session.request({ kind: "event" })).rejects.toThrow("ended");
  });
});
