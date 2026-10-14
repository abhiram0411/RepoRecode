import { useEffect, useState } from "react";
import { predictionMatches, predictionSupported } from "../core/prediction";
import type { Evaluation, Project, SymbolInfo } from "../core/types";
import { glossary, achievements, mastery } from "../core/curriculum";
import { workerTask } from "../core/storage";
export function SourceWalkthrough({ symbol }: { symbol: SymbolInfo }) {
  return (
    <div className="source-walkthrough">
      <h3>Trace the code</h3>
      {symbol.steps?.length ? (
        symbol.steps.map((step, i) => (
          <p key={i}>
            <b>Line {step.line}</b> {step.text}
          </p>
        ))
      ) : (
        <p>Inspect the declaration and follow its referenced symbols.</p>
      )}
      <h3>Concept reference</h3>
      {glossary(symbol).map((g) => (
        <details key={g.term}>
          <summary>{g.term}</summary>
          <p>{g.definition}</p>
        </details>
      ))}
      <p className="muted">
        These statements describe source syntax. Nested functions and branches
        may execute at different times.
      </p>
    </div>
  );
}
export function ProgressPanel({ projects }: { projects: Project[] }) {
  return (
    <section className="progress-panel">
      <h2>Evidence of progress</h2>
      <div className="achievement-grid">
        {achievements(projects).map((a) => (
          <article key={a.id} className={a.earned ? "earned" : ""}>
            <span>{a.earned ? "EARNED" : "LOCKED"}</span>
            <h3>{a.title}</h3>
            <p>{a.description}</p>
          </article>
        ))}
      </div>
      {projects.map((p) => {
        const m = mastery(p);
        return (
          <p key={p.id}>
            <b>{p.name}</b> · {m.rank} · {m.passed}/{m.eligible} supported
            functions practiced
            {" · "}
            {
              p.analysis.symbols.filter(
                (s) => s.kind === "component" && p.completed.includes(s.id),
              ).length
            }{" "}
            component initial renders checked
            {" · "}
            {Object.values(p.missions ?? {}).filter(Boolean).length} feature
            missions completed
          </p>
        );
      })}
      <small>
        Mastery here describes tested inputs in an imported snapshot. It is not
        a certification.
      </small>
    </section>
  );
}
export function PredictionPractice({
  project,
  symbol,
  onSave,
}: {
  project: Project;
  symbol: SymbolInfo;
  onSave: (p: Project) => Promise<void>;
}) {
  const [cases, setCases] = useState<Evaluation["cases"]>([]),
    [answer, setAnswer] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [position, setPosition] = useState(0);
  useEffect(() => {
    setCases([]);
    setAnswer("");
    setStatus("");
    setPosition(0);
  }, [symbol.id]);
  async function prepare() {
    setBusy(true);
    setStatus("");
    try {
      const r = await workerTask<Evaluation>(
        new Worker(new URL("../workers/evaluate.worker.ts", import.meta.url), {
          type: "module",
        }),
        { symbol, code: symbol.code },
        25000,
      );
      if (!r.passed) throw Error(r.diagnostics.join(" "));
      const supported = r.cases.filter((c) =>
        predictionSupported(c.expectedKey),
      );
      if (!supported.length)
        throw Error(
          "These outputs cannot be entered in the prediction field. You can still practice rewriting this function.",
        );
      setCases(supported);
      setPosition(Math.min(1, supported.length - 1));
      if (supported.length !== r.cases.length)
        setStatus(
          "Some compound outputs cannot be represented as JSON and were left out of this prediction challenge.",
        );
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    try {
      if (predictionMatches(answer, cases[position].expectedKey)) {
        setStatus(
          "Correct for this input. Trace the next case to test your understanding.",
        );
        await onSave({
          ...project,
          predictions: {
            ...project.predictions,
            [`${symbol.id}:${cases[position].input}`]: true,
          },
        });
      } else
        setStatus(
          "That result differs. Trace the input through each branch, then try again.",
        );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not check that answer.",
      );
    }
  }
  return (
    <section className="prediction">
      <h3>Predict the output</h3>
      <p>
        Read the function, trace one input, then predict its result. Expected
        outputs come from the isolated reference runtime.
      </p>
      {!cases.length ? (
        <button
          className="secondary"
          disabled={busy || !symbol.standalone}
          onClick={() => void prepare()}
        >
          {busy ? "Evaluating reference…" : "Start prediction challenge"}
        </button>
      ) : (
        <>
          <code>
            {symbol.name}(...{cases[position].input})
          </code>
          <label>
            Your predicted result
            <input
              value={answer}
              maxLength={16000}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="JSON, undefined, NaN or Infinity"
            />
          </label>
          <div className="button-row">
            <button className="primary" onClick={() => void check()}>
              Check prediction
            </button>
            <button
              className="secondary"
              onClick={() => {
                setPosition((position + 1) % cases.length);
                setAnswer("");
                setStatus("");
              }}
            >
              Next input
            </button>
          </div>
        </>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
