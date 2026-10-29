import { createAnalyzer } from "../core/analyze";
let analyze: ReturnType<typeof createAnalyzer> | undefined;
self.onmessage = (e) => {
  try {
    analyze ??= createAnalyzer(e.data.seed);
    self.postMessage({ id: e.data.id, result: analyze(e.data.files) });
  } catch (err) {
    self.postMessage({
      id: e.data.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
