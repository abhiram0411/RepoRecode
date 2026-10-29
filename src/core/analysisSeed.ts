import { z } from "zod";
import { ANALYSIS_VERSION } from "./analysisVersion";
import { validateFiles } from "./import";
import type { Analysis, Project, SourceFile } from "./types";

// Use the index already saved with a project. No second copy of private source,
// extra database, cloud upload, or cache cleanup lifecycle is needed.
export type AnalysisSeed = {
  analysisVersion: number;
  files: SourceFile[];
  analysis: Pick<Analysis, "symbols" | "edges" | "facts" | "diagnostics">;
};

const text = z.string().max(128 * 1024);
const position = z
  .number()
  .int()
  .min(0)
  .max(128 * 1024);
const line = z
  .number()
  .int()
  .min(1)
  .max(128 * 1024 + 1);
const symbolSchema = z.object({
  id: text,
  name: text,
  file: text,
  kind: z.enum([
    "function",
    "component",
    "class",
    "interface",
    "type",
    "method",
  ]),
  start: position,
  end: position,
  line,
  endLine: line,
  code: text,
  practiceTypes: text.optional(),
  typeParameters: text.optional(),
  parameters: z
    .array(z.object({ name: text, type: text, declaration: text.optional() }))
    .max(200),
  calls: z.array(text).max(10000),
  concepts: z.array(text).max(100),
  standalone: z.boolean(),
  async: z.boolean().optional(),
  reason: text.optional(),
  exported: z.boolean(),
  steps: z.array(z.object({ line, text })).max(30).optional(),
});
const seedSchema = z.object({
  analysisVersion: z.literal(ANALYSIS_VERSION),
  files: z
    .array(z.object({ path: text, content: text }))
    .min(1)
    .max(200),
  analysis: z.object({
    symbols: z.array(symbolSchema).max(20000),
    edges: z
      .array(
        z.object({
          source: text,
          target: text,
          kind: z.enum(["imports", "calls", "renders"]),
          evidence: z.literal("static"),
        }),
      )
      .max(40000),
    facts: z
      .array(z.object({ file: text, line, kind: text, detail: text }))
      .max(1000),
    diagnostics: z.array(text).max(3001),
  }),
});

// Cache data is an optimization. Old, malformed, or oversized saved indexes
// always fall back to a fresh analysis, without making a valid import fail.
export function readAnalysisSeed(value: unknown): AnalysisSeed | undefined {
  try {
    if (
      !value ||
      new TextEncoder().encode(JSON.stringify(value)).length > 6 * 1024 * 1024
    )
      return;
    const seed = seedSchema.parse(value);
    validateFiles(seed.files);
    const sources = new Map(
      seed.files
        .filter((f) => /\.[cm]?[jt]sx?$/.test(f.path))
        .map((f) => [f.path, f.content]),
    );
    const ids = new Set<string>();
    for (const symbol of seed.analysis.symbols) {
      const source = sources.get(symbol.file);
      if (
        source === undefined ||
        ids.has(symbol.id) ||
        symbol.id !== `${symbol.file}#${symbol.name}:${symbol.start}` ||
        symbol.start >= symbol.end ||
        symbol.end > source.length ||
        source.slice(symbol.start, symbol.end) !== symbol.code
      )
        return;
      ids.add(symbol.id);
    }
    for (const edge of seed.analysis.edges) {
      const targets = edge.kind === "imports" ? sources : ids;
      if (!targets.has(edge.source) || !targets.has(edge.target)) return;
    }
    if (seed.analysis.facts.some((f) => !sources.has(f.file))) return;
    if (
      seed.analysis.diagnostics.some(
        (d) =>
          d !== "package.json could not be parsed." &&
          ![...sources.keys()].some((path) => d.startsWith(`${path}:`)),
      )
    )
      return;
    return seed;
  } catch {
    return;
  }
}

export function selectAnalysisSeed(
  projects: Project[],
  files: SourceFile[],
): AnalysisSeed | undefined {
  const incoming = new Map(
    files
      .filter((f) => /\.[cm]?[jt]sx?$/.test(f.path))
      .map((f) => [f.path, f.content]),
  );
  let best: Project | undefined;
  let score = 0;
  for (const project of projects.slice(0, 25)) {
    if (
      project?.analysisVersion !== ANALYSIS_VERSION ||
      !Array.isArray(project.files) ||
      project.files.length > 200 ||
      !project.analysis ||
      !Array.isArray(project.analysis.symbols) ||
      !Array.isArray(project.analysis.edges)
    )
      continue;
    const overlap = project.files.filter(
      (f) =>
        f &&
        typeof f.path === "string" &&
        typeof f.content === "string" &&
        incoming.has(f.path) &&
        incoming.get(f.path) === f.content,
    ).length;
    if (overlap > score) {
      best = project;
      score = overlap;
    }
  }
  if (!best) return;
  const { symbols, edges, facts, diagnostics } = best.analysis;
  return {
    analysisVersion: ANALYSIS_VERSION,
    files: best.files,
    analysis: { symbols, edges, facts, diagnostics },
  };
}
