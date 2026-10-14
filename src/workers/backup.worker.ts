import { restoreBackup } from "../core/backup";
import { sourceHash } from "../core/curriculum";
self.onmessage = async (e) => {
  try {
    const result = restoreBackup(e.data.raw, e.data.prefs);
    result.sourceHash = await sourceHash(result.files);
    self.postMessage({ result });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
