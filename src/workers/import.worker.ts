import { zipImport } from "../core/import";
self.onmessage = (e) => {
  try {
    self.postMessage({ result: zipImport(e.data) });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
