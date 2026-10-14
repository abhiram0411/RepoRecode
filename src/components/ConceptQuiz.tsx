import { useEffect, useState } from "react";
import type { SymbolInfo } from "../core/types";
export default function ConceptQuiz({ symbol }: { symbol: SymbolInfo }) {
  const [choice, setChoice] = useState(""),
    [feedback, setFeedback] = useState("");
  useEffect(() => {
    setChoice("");
    setFeedback("");
  }, [symbol.id]);
  return (
    <section className="prediction">
      <h3>Explain the contract</h3>
      <p>
        Which statement accurately describes the source evidence for{" "}
        <code>{symbol.name}</code>?
      </p>
      <label>
        Your answer
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Choose a statement</option>
          <option value="runtime">
            Every call in the source executes on every invocation.
          </option>
          <option value="static">
            The declaration has {symbol.parameters.length} explicit parameter
            {symbol.parameters.length === 1 ? "" : "s"}; runtime behavior
            depends on the executed path.
          </option>
          <option value="types">
            TypeScript types automatically validate every input at runtime.
          </option>
        </select>
      </label>
      <button
        className="secondary"
        disabled={!choice}
        onClick={() =>
          setFeedback(
            choice === "static"
              ? "Correct. Static structure and runtime execution are different kinds of evidence."
              : choice === "runtime"
                ? "A call may be inside a branch or nested function. Seeing it in source does not prove every invocation executes it."
                : "TypeScript types are checked statically. Untrusted values need runtime validation.",
          )
        }
      >
        Check understanding
      </button>
      <p role="status">{feedback}</p>
    </section>
  );
}
