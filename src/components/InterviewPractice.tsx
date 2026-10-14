import { useState } from "react";
import type { Project, SymbolInfo } from "../core/types";
export default function InterviewPractice({
  project,
  symbol,
  onSave,
}: {
  project: Project;
  symbol: SymbolInfo;
  onSave: (p: Project) => Promise<void>;
}) {
  const [answer, setAnswer] = useState(project.notes?.[symbol.id] ?? ""),
    [status, setStatus] = useState("");
  return (
    <details className="interview-practice">
      <summary>Project interview · explain your decisions</summary>
      <ol>
        <li>
          Explain {symbol.name}'s inputs, return paths and purpose using{" "}
          {symbol.file}:{symbol.line}.
        </li>
        <li>
          What changes for empty, boundary or invalid input? Cite a concrete
          example.
        </li>
        <li>
          Which dependencies or side effects can you prove from source? What
          remains uncertain?
        </li>
        <li>
          Describe an alternative implementation, its tradeoffs and a test you
          would add.
        </li>
      </ol>
      <label>
        Your explanation
        <textarea
          value={answer}
          maxLength={6000}
          onChange={(e) => setAnswer(e.target.value)}
          rows={6}
        />
      </label>
      <button
        className="secondary"
        onClick={() =>
          void onSave({
            ...project,
            notes: { ...project.notes, [symbol.id]: answer },
          })
            .then(() =>
              setStatus(
                "Explanation saved. This is a reflection, not an automatically graded result.",
              ),
            )
            .catch((e) => setStatus(String(e)))
        }
      >
        Save explanation
      </button>
      <p role="status">{status}</p>
    </details>
  );
}
