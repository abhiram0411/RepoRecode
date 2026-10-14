import { createInteractivePreview } from "../core/interactivePreview";
let session: Awaited<ReturnType<typeof createInteractivePreview>> | undefined;
let busy = false;
self.onmessage = async ({ data }) => {
  if (busy) {
    self.postMessage({ id: data.id, error: "Preview is busy." });
    return;
  }
  busy = true;
  try {
    if (data.kind === "start") {
      session?.dispose();
      session = await createInteractivePreview(
        data.files,
        data.entry,
        data.exportName,
        data.props,
        data.patch,
      );
      self.postMessage({ id: data.id, result: session.snapshot() });
    } else if (data.kind === "event" && session) {
      self.postMessage({ id: data.id, result: session.dispatch(data.action) });
    } else throw Error("Render the component before interacting.");
  } catch (error) {
    session?.dispose();
    session = undefined;
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    busy = false;
  }
};
