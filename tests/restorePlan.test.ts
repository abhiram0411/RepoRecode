import { it, expect } from "vitest";
import { planProjectRestore } from "../src/core/restorePlan";
import { restoreBackup } from "../src/core/backup";
import type { Preferences } from "../src/core/types";
const project = (code = "export function twice(n:number){return n*2;}") =>
  restoreBackup(
    {
      id: "cfeb7933-b703-493a-8418-b04039f10f38",
      name: "Example",
      origin: "cloud",
      importedAt: "2026-01-01T00:00:00.000Z",
      files: [{ path: "a.ts", content: code }],
      completed: [],
      attempts: [],
      drafts: {},
    },
    { level: "beginner", goal: "understand" } as Preferences,
  );
it("merges matching source without overwriting local work or duplicating progress", async () => {
  const local = project(),
    remote = project(),
    id = local.analysis.symbols[0].id;
  local.drafts[id] = "unfinished local work";
  local.notes = { [id]: "local reflection" };
  remote.drafts[id] = "remote work";
  remote.notes = { [id]: "remote reflection" };
  remote.completed = [id];
  const plan = await planProjectRestore([remote], [local]);
  expect(plan.projects[0].drafts).toEqual(local.drafts);
  expect(plan.projects[0].notes).toEqual(local.notes);
  expect(plan.projects[0].completed).toEqual([id]);
  expect(plan.expected[local.id]).toBe(JSON.stringify(local));
  expect((await planProjectRestore([remote], plan.projects)).projects).toEqual(
    plan.projects,
  );
});
it("preserves changed source under a new ID and finds that copy on repeated restore", async () => {
  const local = project(),
    remote = project("export function twice(n:number){return n*3;}");
  const plan = await planProjectRestore([remote], [local]);
  expect(plan.conflictCopies).toBe(1);
  expect(plan.projects[0].id).not.toBe(local.id);
  expect(plan.projects[0].files).toEqual(remote.files);
  const again = await planProjectRestore([remote], [local, ...plan.projects]);
  expect(again.added).toBe(0);
  expect(again.merged).toBe(1);
});
it("rejects an over-cap restore before changing any project", async () => {
  const local = Array.from({ length: 25 }, (_, n) => ({
    ...project(`export const n = ${n};`),
    id: crypto.randomUUID(),
  }));
  await expect(planProjectRestore([project()], local)).rejects.toThrow(
    "25-project",
  );
  expect(local).toHaveLength(25);
});
