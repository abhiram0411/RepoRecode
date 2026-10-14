import { evaluate } from "../core/evaluate";
self.onmessage = async (e) => {
  try {
    self.postMessage({
      result: await evaluate(e.data.symbol, e.data.code, e.data.feature),
    });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
