import { describe, expect, it } from "vitest";
import { roadmap } from "../src/core/lessons";
import type { Analysis, SymbolInfo } from "../src/core/types";

const symbol = (id: string, line: number): SymbolInfo => ({
  id, name: id, file: "graph.ts", kind: "function", start: 0, end: 1,
  line, endLine: line, code: "", parameters: [], calls: [], concepts: [],
  standalone: true, exported: true,
});
const graph = (ids: string[], pairs: [string, string][]): Analysis => ({
  symbols: ids.map(symbol),
  edges: pairs.map(([source, target]) => ({
    source, target, kind: "calls" as const, evidence: "static" as const,
  })),
  dependencies: {}, framework: "TypeScript", diagnostics: [], files: 1,
});
const prefs = { level: "beginner" as const, goal: "understand" as const };

describe("roadmap prerequisite ordering", () => {
  it.each([
    ["acyclic chain", graph(["A", "B", "C"], [["A", "B"], ["B", "C"]])],
    ["mutual recursion", graph(["A", "B"], [["A", "B"], ["B", "A"]])],
    ["self recursion", graph(["A"], [["A", "A"]])],
    ["three-way cycle", graph(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]])],
    ["duplicate edges", graph(["A", "B"], [["A", "B"], ["A", "B"]])],
    ["lesson cap", graph(Array.from({ length: 65 }, (_, i) => `S${i}`), [["S0", "S64"]])],
  ] as const)("keeps %s prerequisites earlier, unique and source-grounded", (_name: string, a: Analysis) => {
    const lessons = roadmap(a, prefs);
    const position = new Map(lessons.map((l, i) => [l.id, i]));
    expect(lessons.length).toBe(Math.min(a.symbols.length, 60));
    lessons.forEach((lesson, i) => {
      const prerequisites = lesson.prerequisites ?? [];
      expect(new Set(prerequisites).size).toBe(prerequisites.length);
      prerequisites.forEach((id) => {
        expect(position.get(id)).toBeLessThan(i);
        expect(a.edges.some((edge) => edge.kind === "calls" && edge.source === lesson.id && edge.target === id)).toBe(true);
      });
    });
  });
  it("preserves a useful dependency in a two-symbol recursion cycle", () => {
    const lessons = roadmap(graph(["A", "B"], [["A", "B"], ["B", "A"]]), prefs);
    expect(lessons.flatMap((l) => l.prerequisites)).toHaveLength(1);
  });
});
