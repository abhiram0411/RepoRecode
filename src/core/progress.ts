import { z } from "zod";
import type { Project } from "./types";
import { sourceHash } from "./curriculum";

const id = z.string().min(1).max(1000);
const flags = z
  .record(id, z.boolean())
  .refine((v) => Object.keys(v).length <= 3000);
const schema = z
  .object({
    format: z.literal("reporecode-progress"),
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    completed: z.array(id).max(1500),
    attempts: z
      .array(
        z
          .object({
            symbolId: id,
            passed: z.boolean(),
            at: z.string().datetime(),
            tests: z.number().int().min(0).max(64),
          })
          .strict(),
      )
      .max(200),
    predictions: flags,
    missions: flags,
  })
  .strict();

/** Deliberately excludes source, drafts, free text, identity and credentials. */
export async function exportProgress(project: Project) {
  return schema.parse({
    format: "reporecode-progress",
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceHash: await sourceHash(project.files),
    completed: [...new Set(project.completed)],
    attempts: project.attempts
      .slice(-200)
      .map(({ symbolId, passed, at, tests }) => ({
        symbolId,
        passed,
        at,
        tests,
      })),
    predictions: project.predictions ?? {},
    missions: project.missions ?? {},
  });
}

export async function mergeProgress(
  project: Project,
  raw: unknown,
): Promise<Project> {
  const data = schema.parse(raw);
  if (data.sourceHash !== (await sourceHash(project.files)))
    throw Error(
      "This progress belongs to a different source revision. Import the exact original source snapshot first; your current progress has not changed.",
    );
  const ids = new Set(project.analysis.symbols.map((s) => s.id));
  if (
    data.completed.some((x) => !ids.has(x)) ||
    data.attempts.some((x) => !ids.has(x.symbolId))
  )
    throw Error("Progress references an unknown lesson. Nothing was imported.");
  const attempts = [...project.attempts];
  const key = (a: {
    symbolId: string;
    passed: boolean;
    at: string;
    tests: number;
  }) => JSON.stringify([a.symbolId, a.passed, a.at, a.tests]);
  const seen = new Set(attempts.map(key));
  for (const a of data.attempts)
    if (!seen.has(key(a))) {
      attempts.push({ ...a, feedback: "Imported learning record" });
      seen.add(key(a));
    }
  const mergeFlags = (
    local: Record<string, boolean> = {},
    incoming: Record<string, boolean>,
    valid: (key: string) => boolean,
  ) => {
    const merged = { ...local };
    for (const [key, value] of Object.entries(incoming)) {
      if (!valid(key))
        throw Error(
          "Progress contains an unknown exercise. Nothing was imported.",
        );
      merged[key] = !!merged[key] || value;
    }
    return merged;
  };
  return {
    ...project,
    completed: [...new Set([...project.completed, ...data.completed])],
    attempts: attempts.sort((a, b) => a.at.localeCompare(b.at)).slice(-200),
    predictions: mergeFlags(project.predictions, data.predictions, (key) =>
      [...ids].some((id) => key.startsWith(id + ":")),
    ),
    missions: mergeFlags(project.missions, data.missions, (key) =>
      [...ids].some((id) => key === id + ":double-output"),
    ),
  };
}
