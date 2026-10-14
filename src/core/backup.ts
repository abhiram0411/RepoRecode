import { z } from "zod";
import type { Project, Preferences } from "./types";
import { validateFiles } from "./import";
import { analyze } from "./analyze";
import { roadmap } from "./lessons";
import { ANALYSIS_VERSION } from "./analysisVersion";
const backupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  origin: z.string().max(1000),
  importedAt: z.string().datetime(),
  files: z
    .array(z.object({ path: z.string().max(500), content: z.string() }))
    .max(200),
  completed: z.array(z.string()).max(1500),
  attempts: z
    .array(
      z.object({
        symbolId: z.string(),
        passed: z.boolean(),
        at: z.string().datetime(),
        tests: z.number().int().min(0).max(64),
        feedback: z.string().max(5000),
      }),
    )
    .max(200),
  drafts: z.record(z.string(), z.string().max(16000)),
  predictions: z.record(z.string().max(500), z.boolean()).optional(),
  missions: z.record(z.string().max(500), z.boolean()).optional(),
  notes: z.record(z.string().max(500), z.string().max(6000)).optional(),
  aiLessons: z
    .record(
      z.string().max(500),
      z.object({
        summary: z.string().max(1500),
        inputs: z.string().max(1500),
        outputs: z.string().max(1500),
        sideEffects: z.string().max(1500),
        blocks: z
          .array(
            z.object({
              file: z.string().max(250),
              line: z.number().int().positive(),
              explanation: z.string().max(1500),
            }),
          )
          .max(12),
        commonMistakes: z.array(z.string().max(1500)).max(5),
        questions: z.array(z.string().max(1500)).max(5),
      }),
    )
    .optional(),
});
export function restoreBackup(raw: unknown, prefs: Preferences): Project {
  const data = backupSchema.parse(raw);
  const files = validateFiles(data.files);
  const analysis = analyze(files),
    ids = new Set(analysis.symbols.map((s) => s.id));
  return {
    ...data,
    files,
    analysis,
    analysisVersion: ANALYSIS_VERSION,
    lessons: roadmap(analysis, prefs),
    completed: [...new Set(data.completed)].filter((id) => ids.has(id)),
    attempts: data.attempts.filter((a) => ids.has(a.symbolId)),
    drafts: Object.fromEntries(
      Object.entries(data.drafts).filter(([id]) => ids.has(id)),
    ),
    notes: Object.fromEntries(
      Object.entries(data.notes ?? {}).filter(([id]) => ids.has(id)),
    ),
    missions: Object.fromEntries(
      Object.entries(data.missions ?? {}).filter(([id]) =>
        analysis.symbols.some((s) => id === s.id + ":double-output"),
      ),
    ),
    predictions: Object.fromEntries(
      Object.entries(data.predictions ?? {}).filter(([id]) =>
        analysis.symbols.some((s) => id.startsWith(s.id + ":")),
      ),
    ),
    aiLessons: Object.fromEntries(
      Object.entries(data.aiLessons ?? {}).filter(([id, l]) =>
        analysis.symbols.some(
          (s) =>
            id.startsWith(s.id + ":") &&
            l.blocks.every(
              (b) =>
                b.file === s.file && b.line >= s.line && b.line <= s.endLine,
            ),
        ),
      ),
    ),
  };
}
