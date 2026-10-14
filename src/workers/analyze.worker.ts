import { createAnalyzer } from "../core/analyze";
const analyze = createAnalyzer();
self.onmessage = (e) => {
  try {
    self.postMessage({ id: e.data.id, result: analyze(e.data.files) });
  } catch (err) {
    self.postMessage({
      id: e.data.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
