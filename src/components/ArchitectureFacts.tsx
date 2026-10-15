import { useState } from "react";
import type { Project, SymbolInfo } from "../core/types";
export default function ArchitectureFacts({
  project,
  onSelect,
}: {
  project: Project;
  onSelect: (s: SymbolInfo) => void;
}) {
  const [kind, setKind] = useState("");
  const facts = project.analysis.facts ?? [];
  const relations = project.analysis.stateFlow?.relations ?? [];
  function select(file: string, line: number) {
    return project.analysis.symbols
      .filter((s) => s.file === file && s.line <= line && s.endLine >= line)
      .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  }
  return (
    <details className="architecture-facts">
      <summary>Explore the project index · {facts.length} source facts</summary>
      <label>
        Filter source facts
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All facts</option>
          {[...new Set(facts.map((f) => f.kind))].sort().map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <div className="fact-list">
        {facts
          .filter((f) => !kind || f.kind === kind)
          .map((f, i) => {
            const s =
              project.analysis.symbols.find(
                (s) =>
                  s.file === f.file && s.line <= f.line && s.endLine >= f.line,
              ) ?? project.analysis.symbols.find((s) => s.file === f.file);
            return (
              <article key={i}>
                <b>{f.kind}</b>
                <p>{f.detail}</p>
                {s ? (
                  <button className="text-button" onClick={() => onSelect(s)}>
                    {f.file}:{f.line}
                  </button>
                ) : (
                  <code>
                    {f.file}:{f.line}
                  </code>
                )}
              </article>
            );
          })}
      </div>
      {!!relations.length && (
        <>
          <h3>State relationships</h3>
          <p className="muted">
            Source references to React state and its updater, including up to
            two const initializer steps within the same function. Simple
            expressions are traced across up to 200 candidate bindings and eight
            paths per binding; calls, property access, mutable bindings and
            closures are excluded. These references do not prove computed
            values, callback execution or runtime data flow.
          </p>
          <ul
            className="state-relations-list"
            aria-label="Static state relationships"
          >
            {relations.map((r, i) => {
              const site = select(r.site.file, r.site.line),
                state = select(r.state.file, r.state.line);
              return (
                <li key={i}>
                  <strong>{r.state.name}</strong> ·{" "}
                  {
                    {
                      update: "updater call",
                      handler: "updater referenced in prop",
                      prop: "state referenced in prop",
                      derive: "state referenced in initializer",
                      read: "state reference",
                    }[r.kind]
                  }
                  <p>{r.site.label}</p>
                  {!!r.via?.length && (
                    <p>
                      Via{" "}
                      {r.via.map((v, index) => {
                        const target = select(v.file, v.line);
                        return (
                          <span key={index}>
                            {index > 0 ? " → " : ""}
                            <button
                              className="text-button"
                              disabled={!target}
                              onClick={() => target && onSelect(target)}
                            >
                              {v.name} · {v.file}:{v.line}
                            </button>
                          </span>
                        );
                      })}
                    </p>
                  )}
                  <button
                    className="text-button"
                    disabled={!site}
                    onClick={() => site && onSelect(site)}
                  >
                    Use: {r.site.file}:{r.site.line}
                  </button>
                  <button
                    className="text-button"
                    disabled={!state}
                    onClick={() => state && onSelect(state)}
                  >
                    State: {r.state.file}:{r.state.line}
                  </button>
                </li>
              );
            })}
          </ul>
          {!!project.analysis.stateFlow?.omitted && (
            <p>
              {project.analysis.stateFlow.omitted} additional relationships
              omitted after the 200-relationship limit.
            </p>
          )}
        </>
      )}
      <h3>Declared dependencies</h3>
      <dl>
        {Object.entries(project.analysis.dependencies).map(
          ([name, version]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{String(version)}</dd>
            </div>
          ),
        )}
      </dl>
      <p className="muted">
        Facts describe syntax, not observed behavior. Candidate relationships
        require inspection. The index is bounded to 1,000 facts and 1,500
        declarations.
      </p>
    </details>
  );
}
