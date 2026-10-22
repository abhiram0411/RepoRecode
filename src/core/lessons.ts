import type { Analysis, Preferences, Lesson, SymbolInfo } from "./types";
export function roadmap(
  analysis: Analysis,
  prefs: Pick<Preferences, "level" | "goal">,
): Lesson[] {
  const candidates = [...analysis.symbols].sort(
    (a, b) =>
      Number(b.standalone) - Number(a.standalone) ||
      a.calls.length - b.calls.length ||
      a.line - b.line,
  );
  const ordered: SymbolInfo[] = [],
    visited = new Set<string>(),
    visiting = new Set<string>();
  const add = (s: SymbolInfo) => {
    if (visited.has(s.id) || visiting.has(s.id)) return;
    visiting.add(s.id);
    for (const e of analysis.edges.filter(
      (e) => e.kind === "calls" && e.source === s.id,
    )) {
      const dep = candidates.find((x) => x.id === e.target);
      if (dep) add(dep);
    }
    visiting.delete(s.id);
    visited.add(s.id);
    ordered.push(s);
  };
  candidates.forEach(add);
  // Cyclic call graphs cannot be represented as cyclic lesson prerequisites.
  // Keep only dependencies that appear earlier in the learning order.
  const lessonOrder = new Map(
    ordered.slice(0, 60).map((symbol, index) => [symbol.id, index]),
  );
  return ordered.slice(0, 60).map((s, index) => ({
    id: s.id,
    symbolId: s.id,
    title: `${prefs.goal === "debug" ? "Trace" : prefs.goal === "interview" ? "Explain" : "Understand"} ${s.name}`,
    concept: s.concepts[0] ?? s.kind,
    objectives: [
      prefs.level === "beginner"
        ? `Identify the inputs and outputs of ${s.name}.`
        : `Trace dependencies and edge cases in ${s.name}.`,
      `Explain ${s.concepts.join(", ").toLowerCase() || "this declaration"} using ${s.file}:${s.line}.`,
      s.standalone
        ? "Reconstruct the function and pass behavioral probes."
        : s.kind === "component" && s.exported
          ? "Reconstruct initial React output using supported primitive props; event behavior is not graded."
          : "Study the source; executable practice requires additional runtime support.",
    ],
    prerequisites: [
      ...new Set(
        analysis.edges
          .filter(
            (e) =>
              e.kind === "calls" &&
              e.source === s.id &&
              (lessonOrder.get(e.target) ?? Infinity) < index,
          )
          .map((e) => e.target),
      ),
    ],
  }));
}
export function explain(s: SymbolInfo) {
  return [
    `${s.name} is a ${s.exported ? "exported " : "local "}${s.kind} declared at ${s.file}:${s.line}–${s.endLine}.`,
    s.parameters.length
      ? `Inputs: ${s.parameters.map((p) => `${p.name} (${p.type})`).join(", ")}.`
      : "No explicit parameters were found.",
    s.calls.length
      ? `The syntax contains calls to ${s.calls.join(", ")}. A call appearing in source does not prove it runs on every path.`
      : "No call expressions were found inside this declaration.",
    s.concepts.length
      ? `Study focus: ${s.concepts.join(", ")}.`
      : "Read the declaration and identify its contract.",
    "Trace each return path and consider empty, boundary, and invalid inputs. The source facts above are statically derived; purpose and runtime effects require further inspection.",
  ];
}
