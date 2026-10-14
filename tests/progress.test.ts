import { describe, it, expect } from "vitest";
import { exportProgress, mergeProgress } from "../src/core/progress";
import { restoreBackup } from "../src/core/backup";
import type { Preferences } from "../src/core/types";
const project = () =>
  restoreBackup(
    {
      id: "cfeb7933-b703-493a-8418-b04039f10f38",
      name: "Example",
      origin: "local",
      importedAt: new Date().toISOString(),
      files: [
        {
          path: "a.ts",
          content: "export function twice(n:number){return n*2;}",
        },
      ],
      completed: [],
      attempts: [],
      drafts: {},
    },
    { level: "beginner", goal: "understand" } as Preferences,
  );
describe("portable learning progress", () => {
  it("excludes source, free text and identity, and rehashes actual files", async () => {
    const p = project(),
      id = p.analysis.symbols[0].id;
    p.sourceHash = "stale";
    p.notes = { [id]: "private note" };
    p.drafts = { [id]: "secret draft" };
    p.attempts = [
      {
        symbolId: id,
        passed: false,
        at: new Date().toISOString(),
        tests: 2,
        feedback: "secret diagnostic",
      },
    ];
    const output = await exportProgress(p),
      json = JSON.stringify(output);
    for (const secret of [
      "private note",
      "secret draft",
      "secret diagnostic",
      p.id,
      "return n*2",
    ])
      expect(json).not.toContain(secret);
    expect(output.sourceHash).toHaveLength(64);
  });
  it("merges repeatedly across installations without erasing drafts, notes or successes", async () => {
    const p = project(),
      id = p.analysis.symbols[0].id;
    p.completed = [id];
    p.missions = { [id + ":double-output"]: true };
    p.attempts = [
      {
        symbolId: id,
        passed: true,
        at: "2026-01-01T00:00:00.000Z",
        tests: 3,
        feedback: "okay",
      },
    ];
    const remote = await exportProgress(p),
      local = {
        ...project(),
        id: crypto.randomUUID(),
        drafts: { [id]: "local draft" },
        notes: { [id]: "local note" },
      };
    const first = await mergeProgress(local, remote),
      second = await mergeProgress(first, remote);
    expect(second).toEqual(first);
    expect(second.id).toBe(local.id);
    expect(second.drafts).toEqual(local.drafts);
    expect(second.notes).toEqual(local.notes);
    expect(second.completed).toEqual([id]);
    expect(second.attempts).toHaveLength(1);
    const empty = await exportProgress(project());
    expect(
      (await mergeProgress(second, empty)).missions?.[id + ":double-output"],
    ).toBe(true);
  });
  it("rejects mismatched revisions, future versions and unknown lessons atomically", async () => {
    const p = project(),
      raw = await exportProgress(p),
      before = JSON.stringify(p);
    await expect(
      mergeProgress(
        { ...p, files: [{ path: "a.ts", content: "changed" }] },
        raw,
      ),
    ).rejects.toThrow("different source revision");
    await expect(mergeProgress(p, { ...raw, version: 2 })).rejects.toThrow();
    await expect(
      mergeProgress(p, { ...raw, completed: ["invented"] }),
    ).rejects.toThrow("unknown lesson");
    await expect(mergeProgress(p, { ...raw, files: [] })).rejects.toThrow();
    expect(JSON.stringify(p)).toBe(before);
  });
});
