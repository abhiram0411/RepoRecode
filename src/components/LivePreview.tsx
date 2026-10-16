import { useEffect, useRef, useState } from "react";
import type { Project, SymbolInfo } from "../core/types";
import { workerTask } from "../core/storage";
import { PreviewSession } from "../core/previewSession";
import type {
  PreviewAction,
  PreviewObservation,
  RuntimeTrace,
  StateTrace,
} from "../core/interactivePreview";
type Snapshot = {
  html: string;
  css?: string;
  styleWarnings?: string[];
  entry: string;
  exportName: string;
  trace?: RuntimeTrace;
  state?: StateTrace;
};
export default function LivePreview({
  project,
  selected,
  draft,
  onSelect,
}: {
  project: Project;
  selected: SymbolInfo;
  draft?: string;
  onSelect: (id: string) => void;
}) {
  const components = project.analysis.symbols.filter(
      (s) => s.kind === "component" && s.exported,
    ),
    [entry, setEntry] = useState(
      components.find((s) => s.name === "App")?.id ?? components[0]?.id ?? "",
    ),
    [snapshot, setSnapshot] = useState<Snapshot>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [inspect, setInspect] = useState(true),
    [props, setProps] = useState("{}"),
    [mode, setMode] = useState("initial"),
    [active, setActive] = useState(false),
    [observations, setObservations] = useState<PreviewObservation[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const session = useRef<PreviewSession | null>(null);
  const generation = useRef(0);
  const focus = useRef<{
    id: string;
    start: number | null;
    end: number | null;
  } | null>(null);
  function stop() {
    generation.current++;
    session.current?.dispose();
    session.current = null;
    focus.current = null;
  }
  useEffect(() => {
    stop();
    setActive(false);
    setBusy(false);
    return stop;
  }, [
    project.id,
    entry,
    props,
    mode,
    draft,
    draft === undefined ? undefined : selected.id,
  ]);
  useEffect(() => {
    setSnapshot(undefined);
    setEntry(
      components.find((s) => s.name === "App")?.id ?? components[0]?.id ?? "",
    );
  }, [project.id]);
  async function render() {
    stop();
    const revision = generation.current;
    setActive(false);
    setObservations([]);
    setBusy(true);
    setError("");
    try {
      const symbol = components.find((s) => s.id === entry);
      if (!symbol) throw Error("No exported React component was found.");
      const data = JSON.parse(props);
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw Error("Props must be a JSON object.");
      const request = {
        files: project.files,
        patch:
          draft === undefined ? undefined : { symbol: selected, code: draft },
        entry: symbol.file,
        exportName: /export\s+default/.test(symbol.code)
          ? "default"
          : symbol.name,
        props: data,
      };
      let result: Snapshot;
      if (mode === "interactive") {
        const current = new PreviewSession(
          new Worker(
            new URL("../workers/interactive.worker.ts", import.meta.url),
            { type: "module" },
          ),
        );
        session.current = current;
        result = await current.request({ kind: "start", ...request });
      } else {
        result = await workerTask<Snapshot>(
          new Worker(new URL("../workers/preview.worker.ts", import.meta.url), {
            type: "module",
          }),
          request,
          15000,
        );
      }
      if (generation.current !== revision) return;
      setSnapshot(result);
      setActive(mode === "interactive");
    } catch (e) {
      if (generation.current !== revision) return;
      setBusy(false);
      stop();
      setActive(false);
      setError(String(e));
    } finally {
      if (generation.current === revision) setBusy(false);
    }
  }
  async function interact(action: PreviewAction) {
    const current = session.current,
      revision = generation.current;
    if (!current) return;
    try {
      const next = await current.request({ kind: "event", action });
      if (generation.current !== revision) return;
      setSnapshot(next);
      setObservations(next.observations);
    } catch (e) {
      if (generation.current !== revision) return;
      stop();
      setActive(false);
      setError(String(e));
    }
  }
  function sourceAt(file: string, line: number) {
    return project.analysis.symbols
      .filter((s) => s.file === file && s.line <= line && s.endLine >= line)
      .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  }
  function wire() {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    function forward(
      e: Event,
      type: PreviewAction["type"],
      override?: Element,
    ) {
      if (inspect || !active || !session.current) return;
      const target = override ?? (e.target as Element);
      const marker =
        type === "input"
          ? '[data-rr-events~="input"], [data-rr-events~="change"]'
          : `[data-rr-events~="${type}"]`;
      const submitter = target.closest(
        "button, input",
      ) as HTMLButtonElement | null;
      const submits =
        type === "click" &&
        submitter?.type === "submit" &&
        submitter.closest('form[data-rr-events~="submit"]');
      if (!target.closest(marker) && !submits) return;
      const el = target.closest("[data-rr-node]") as HTMLInputElement | null;
      if (!el || el.disabled) return;
      // Preserve caret and focus when a controlled field's snapshot is replaced.
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        focus.current = {
          id: el.dataset.rrNode!,
          start: el.selectionStart,
          end: el.selectionEnd,
        };
      } else focus.current = null;
      void interact({
        id: el.dataset.rrNode!,
        type,
        value: typeof el.value === "string" ? el.value.slice(0, 2000) : "",
        checked: !!el.checked,
      });
    }
    doc.onclick = (e) => {
      const control = (e.target as Element).closest(
        "button, input",
      ) as HTMLButtonElement | null;
      if (
        inspect ||
        !active ||
        control?.type === "submit" ||
        (e.target as Element).closest("a")
      )
        e.preventDefault();
      if (!inspect) {
        forward(e, "click");
        return;
      }
      const el = (e.target as Element).closest("[data-rr-file]");
      if (!el) return;
      const path = el.getAttribute("data-rr-file"),
        line = Number(el.getAttribute("data-rr-line"));
      const symbol = sourceAt(path ?? "", line);
      if (symbol) onSelect(symbol.id);
    };
    doc.oninput = (e) => {
      const target = e.target as HTMLInputElement;
      if (
        (target.tagName === "INPUT" &&
          !["checkbox", "radio"].includes(target.type)) ||
        target.tagName === "TEXTAREA"
      )
        forward(e, "input");
    };
    doc.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (
        target.tagName === "SELECT" ||
        ["checkbox", "radio"].includes(target.type)
      )
        forward(e, "change");
    };
    doc.onsubmit = (e) => {
      e.preventDefault();
      forward(e, "submit");
    };
    doc.onkeydown = (e) => {
      const target = e.target as HTMLInputElement;
      if (
        e.key === "Enter" &&
        target.tagName === "INPUT" &&
        !["checkbox", "radio", "button", "submit"].includes(target.type)
      ) {
        const form = target.closest("form");
        if (form) {
          e.preventDefault();
          forward(e, "submit", form);
        }
      }
    };
    const saved = focus.current;
    if (saved) {
      const el = doc.querySelector(
        `[data-rr-node="${saved.id}"]`,
      ) as HTMLInputElement | null;
      el?.focus();
      if (el && saved.start !== null) {
        try {
          el.setSelectionRange(saved.start, saved.end);
        } catch {
          /* Non-text controls have no caret. */
        }
      }
    }
    for (const el of doc.querySelectorAll("[data-rr-file]")) {
      (el as HTMLElement).style.outline = "";
      if (
        el.getAttribute("data-rr-file") === selected.file &&
        Number(el.getAttribute("data-rr-line")) >= selected.line &&
        Number(el.getAttribute("data-rr-line")) <= selected.endLine
      )
        (el as HTMLElement).style.outline = "2px solid #718c46";
    }
  }
  useEffect(() => {
    wire();
  }, [inspect, selected.id, active]);
  const html = snapshot
    ? `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'"><style>body{font:14px system-ui;margin:20px;color:#172014;background:white}button,input{font:inherit}*{box-sizing:border-box}</style><style>${(snapshot.css ?? "").replace(/</g, "\\3c ")}</style></head><body>${snapshot.html}</body></html>`
    : "";
  return (
    <div className="live-preview">
      <div className="preview-controls">
        <label>
          Preview mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="initial">Initial render</option>
            <option value="interactive">Interactive React</option>
          </select>
        </label>
        <label>
          Root component
          <select value={entry} onChange={(e) => setEntry(e.target.value)}>
            {components.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Component props
          <input
            value={props}
            onChange={(e) => setProps(e.target.value)}
            maxLength={2000}
          />
        </label>
        <button
          className="secondary"
          onClick={() => void render()}
          disabled={busy || !entry}
        >
          {busy ? "Rendering safely…" : "Render current code"}
        </button>
        <label className="check">
          <input
            type="checkbox"
            checked={inspect}
            onChange={(e) => setInspect(e.target.checked)}
          />
          Inspect source locations
        </label>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
          {snapshot && " The last working render is preserved."}
        </p>
      )}
      {mode === "interactive" && snapshot && (
        <p role="status">
          {active
            ? inspect
              ? "Interactive session ready. Turn off source inspection to use the controls."
              : "Interactive session ready. Use the controls inside the preview."
            : "Render current code to start a fresh interactive session."}
        </p>
      )}
      {snapshot ? (
        <iframe
          ref={frame}
          title="Isolated React render snapshot"
          sandbox="allow-same-origin"
          inert={busy || (mode === "interactive" && !active)}
          aria-busy={busy}
          srcDoc={html}
          onLoad={wire}
        />
      ) : (
        <p>
          Render an exported component to see its real initial React output.
        </p>
      )}
      <p className="muted">
        {mode === "initial"
          ? "Initial render only; effects and event handlers do not run. "
          : "Interactive React supports synchronous click, input, change and submit handlers, state, reducers and effects. Sessions reset after source or props changes and allow up to 200 interactions. DOM refs, timers, async handlers and full browser behavior are unsupported. "}
        Local side-effect CSS and default CSS module imports support bounded
        colors, layout, typography, variables, media queries and explicit &amp;
        nested rules up to four block levels. Implicit nesting and unsupported
        syntax are omitted. Modules scope up to 200 class and ID names per file.
        Composition, global module selectors, named/namespace CSS imports,
        animations, external styles/fonts, images, network and other packages
        are unsupported. Imported code runs in QuickJS; this frame contains
        sanitized HTML and cannot run scripts. Turn on source inspection to
        select an element and find its JSX source.
      </p>
      {!!snapshot?.styleWarnings?.length && (
        <details>
          <summary>Styles omitted from this preview</summary>
          <ul>
            {snapshot.styleWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      {observations.length > 0 && (
        <div aria-label="Observed preview events">
          <strong>Observed events</strong>
          <ol>
            {observations.map((item) => (
              <li key={item.sequence}>
                #{item.sequence} {item.event}:{" "}
                {item.changed
                  ? "rendered output changed"
                  : "rendered output unchanged"}
              </li>
            ))}
          </ol>
          <p className="muted">
            These are observed event deliveries and HTML changes, not a complete
            function or state trace.
          </p>
        </div>
      )}
      {mode === "interactive" && snapshot?.trace && (
        <details className="runtime-trace" open>
          <summary>
            Observed function calls ·{" "}
            {observations.length ? "latest interaction" : "initial render"}
          </summary>
          <p className="muted">
            Function entries recorded inside this isolated preview, in execution
            order. Select a mapped call to open its source. This is a bounded
            trace of imported code, not a call stack, state-value or network
            trace.
          </p>
          {snapshot.trace.calls.length ? (
            <ol aria-label="Observed function calls">
              {snapshot.trace.calls.map((call, index) => {
                const symbol = sourceAt(call.file, call.line);
                return (
                  <li key={index}>
                    <button
                      className="secondary"
                      disabled={!symbol}
                      onClick={() => symbol && onSelect(symbol.id)}
                    >
                      {call.name} · {call.file}:{call.line}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p>No instrumented function entries were recorded.</p>
          )}
          {snapshot.trace.omitted > 0 && (
            <p>
              {snapshot.trace.omitted} additional calls omitted after the
              100-call limit.
            </p>
          )}
        </details>
      )}
      {mode === "interactive" && snapshot?.state && (
        <details className="runtime-trace" open>
          <summary>
            Observed state reads ·{" "}
            {observations.length ? "latest interaction" : "initial render"}
          </summary>
          <p className="muted">
            Values returned by directly imported React useState/useReducer
            hooks, in render order. Repeated entries may come from different
            component instances or repeat renders. These bounded summaries are
            not a final state inventory or a before/after comparison. Getters
            are not evaluated; nested and long values are shortened. Values stay
            in this local preview.
          </p>
          {snapshot.state.reads.length ? (
            <ol aria-label="Observed state reads">
              {snapshot.state.reads.map((read, index) => {
                const symbol = sourceAt(read.file, read.line);
                return (
                  <li key={index}>
                    <button
                      className="secondary"
                      disabled={!symbol}
                      onClick={() => symbol && onSelect(symbol.id)}
                    >
                      {read.label} · {read.hook} · {read.file}:{read.line}
                    </button>
                    <pre>{read.value}</pre>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p>
              No supported state hook reads were observed in this render or
              interaction.
            </p>
          )}
          {snapshot.state.omitted > 0 && (
            <p>
              {snapshot.state.omitted} additional reads omitted after the
              100-read limit.
            </p>
          )}
        </details>
      )}
    </div>
  );
}
