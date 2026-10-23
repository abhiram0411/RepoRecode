import { useDialog } from "../core/useDialog";
import type { SourceFile } from "../core/types";

export default function SourceLocation({
  file,
  line,
  onClose,
}: {
  file: SourceFile;
  line: number;
  onClose: () => void;
}) {
  const dialog = useDialog(true, onClose);
  const lines = file.content.split("\n");
  const start = Math.max(0, line - 9);
  return (
    <div className="modal-backdrop">
      <section
        className="modal source-location"
        role="dialog"
        aria-modal="true"
        aria-label="Source location"
        ref={dialog}
        tabIndex={-1}
      >
        <button
          className="modal-close"
          aria-label="Close source location"
          onClick={onClose}
        >
          ×
        </button>
        <p className="eyebrow">IMPORTED SOURCE · READ ONLY</p>
        <h2>
          {file.path}:{line}
        </h2>
        <p>
          Nearby source lines. Highlighted line {line} is the indexed location.
        </p>
        <pre tabIndex={0} aria-label="Source excerpt">
          {lines.slice(start, line + 8).map((text, i) => (
            <span
              key={start + i}
              className={
                start + i + 1 === line
                  ? "source-line selected-line"
                  : "source-line"
              }
            >
              <span className="line-number" aria-hidden="true">
                {start + i + 1}
              </span>
              {text || " "}
              {"\n"}
            </span>
          ))}
        </pre>
        <button className="secondary" onClick={onClose}>
          Back to workspace
        </button>
      </section>
    </div>
  );
}
