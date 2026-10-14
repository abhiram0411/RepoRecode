import { renderPreview } from "../core/preview";
self.onmessage = async (e) => {
  try {
    self.postMessage({
      result: await renderPreview(
        e.data.files,
        e.data.entry,
        e.data.exportName,
        e.data.props,
        e.data.patch,
      ),
    });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
