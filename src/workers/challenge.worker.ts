import { bugChallenge, completionChallenge } from "../core/challenges";
import { evaluate } from "../core/evaluate";
self.onmessage = async (e) => {
  try {
    const symbol = e.data.symbol ?? e.data;
    const code =
      e.data.kind === "completion"
        ? completionChallenge(symbol)
        : bugChallenge(symbol);
    if (!code) {
      self.postMessage({ result: null });
      return;
    }
    const reference = await evaluate(symbol, symbol.code);
    if (!reference.passed) {
      self.postMessage({ result: null });
      return;
    }
    const mutation = await evaluate(symbol, code);
    self.postMessage({
      result:
        mutation.supported &&
        !mutation.passed &&
        mutation.cases.some((c) => !c.passed)
          ? code
          : null,
    });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
