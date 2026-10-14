import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import {
  listProjects,
  saveProject,
  deleteProject,
  saveRestorePlan,
  saveAnalysisUpdate,
} from "../src/core/storage";
import { ANALYSIS_VERSION } from "../src/core/analysisVersion";
import { planProjectRestore } from "../src/core/restorePlan";
import { restoreBackup } from "../src/core/backup";
import type { Preferences } from "../src/core/types";

const project = (n = 0) =>
  restoreBackup(
    {
      id: crypto.randomUUID(),
      name: `Example ${n}`,
      origin: "cloud",
      importedAt: "2026-01-01T00:00:00.000Z",
      files: [{ path: "a.ts", content: `export const n = ${n};` }],
      completed: [],
      attempts: [],
      drafts: {},
    },
    { level: "beginner", goal: "understand" } as Preferences,
  );

beforeEach(async () => {
  for (const p of await listProjects()) await deleteProject(p.id);
});

it("refreshes derived analysis atomically while preserving newer learning edits", async () => {
  const snapshot = project();
  snapshot.analysisVersion = undefined;
  await saveProject(snapshot);
  const newer = {
    ...snapshot,
    drafts: { work: "new draft" },
    notes: { work: "new note" },
    completed: ["work"],
  };
  await saveProject(newer);
  const refreshed = await saveAnalysisUpdate(
    snapshot,
    { ...snapshot.analysis, framework: "refreshed" },
    [],
  );
  expect(refreshed).toMatchObject({
    drafts: newer.drafts,
    notes: newer.notes,
    completed: newer.completed,
    analysisVersion: ANALYSIS_VERSION,
  });
  expect(refreshed.analysis.framework).toBe("refreshed");
  expect(await listProjects()).toEqual([refreshed]);
});

it("does not recreate deleted projects or apply an index to changed source", async () => {
  const snapshot = project();
  await saveProject(snapshot);
  const changed = {
    ...snapshot,
    files: [{ path: "a.ts", content: "export const changed=2;" }],
  };
  await saveProject(changed);
  await expect(
    saveAnalysisUpdate(snapshot, snapshot.analysis, []),
  ).rejects.toThrow("source changed");
  expect(await listProjects()).toEqual([changed]);
  await deleteProject(snapshot.id);
  await expect(
    saveAnalysisUpdate(snapshot, snapshot.analysis, []),
  ).rejects.toThrow("removed");
  expect(await listProjects()).toEqual([]);
});

it("commits an entire valid restore and preserves local drafts", async () => {
  const local = project();
  local.drafts.example = "unfinished work";
  await saveProject(local);
  const remote = { ...local, drafts: { example: "remote draft" } };
  const plan = await planProjectRestore([remote, project(1)], [local]);
  await saveRestorePlan(plan);
  const stored = await listProjects();
  expect(stored).toHaveLength(2);
  expect(stored.find((p) => p.id === local.id)?.drafts.example).toBe(
    "unfinished work",
  );
});

it("rejects stale work without adding other projects from the same batch", async () => {
  const local = project();
  await saveProject(local);
  const plan = await planProjectRestore([project(1), local], [local]);
  local.drafts.example = "new edit made during restore";
  await saveProject(local);
  await expect(saveRestorePlan(plan)).rejects.toThrow("Local work changed");
  expect(await listProjects()).toEqual([local]);
});

it("rechecks the project cap inside the transaction", async () => {
  const plan = await planProjectRestore([project(99)], []);
  for (let n = 0; n < 25; n++) await saveProject(project(n));
  await expect(saveRestorePlan(plan)).rejects.toThrow("25-project");
  expect(await listProjects()).toHaveLength(25);
  expect((await listProjects()).some((p) => p.id === plan.projects[0].id)).toBe(
    false,
  );
});

it("rejects an oversized batch before committing any project", async () => {
  const plan = await planProjectRestore([project(), project(1)], []);
  plan.projects[1].drafts.example = "x".repeat(6 * 1024 * 1024);
  await expect(saveRestorePlan(plan)).rejects.toThrow("6 MiB");
  expect(await listProjects()).toEqual([]);
});
