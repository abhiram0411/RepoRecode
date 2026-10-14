import { describe, it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
import { demoFiles } from "../src/core/demo";
import { roadmap } from "../src/core/lessons";
import {
  achievements,
  glossary,
  sourceHash,
  mastery,
} from "../src/core/curriculum";
import { restoreBackup } from "../src/core/backup";
import type { Preferences } from "../src/core/types";
import { bugChallenge } from "../src/core/challenges";
describe("curriculum evidence", () => {
  it("does not count component completions as completed function mastery", () => {
    const p = restoreBackup(
      {
        id: crypto.randomUUID(),
        name: "Trail",
        origin: "sample",
        importedAt: new Date().toISOString(),
        files: demoFiles,
        completed: [],
        attempts: [],
        drafts: {},
      },
      { level: "beginner", goal: "understand" } as Preferences,
    );
    p.completed = p.analysis.symbols
      .filter((s) => s.kind === "component")
      .map((s) => s.id);
    expect(mastery(p).passed).toBe(0);
    expect(mastery(p).rank).not.toBe("Practiced snapshot");
    p.completed.push(
      ...p.analysis.symbols.filter((s) => s.standalone).map((s) => s.id),
    );
    expect(mastery(p).rank).toBe("Practiced snapshot");
  });
  it("creates an actual source mutation for bug-fixing practice", () => {
    const s = analyze([
      {
        path: "a.ts",
        content: "export function double(n:number){return n*2;}",
      },
    ]).symbols[0];
    expect(bugChallenge(s)).toContain("n+2");
    expect(bugChallenge(s)).not.toBe(s.code);
  });
  it("resolves an imported function to its actual declaration", () => {
    const a = analyze(demoFiles);
    const caller = a.symbols.find((s) => s.name === "TrailCard")!;
    const target = a.symbols.find((s) => s.name === "completionRate")!;
    expect(
      a.edges.some(
        (e) =>
          e.source === caller.id &&
          e.target === target.id &&
          e.kind === "calls",
      ),
    ).toBe(true);
    const lessons = roadmap(a, { level: "beginner", goal: "understand" });
    expect(lessons.findIndex((l) => l.id === target.id)).toBeLessThan(
      lessons.findIndex((l) => l.id === caller.id),
    );
  });
  it("grounds walkthrough steps in actual source lines", () => {
    const a = analyze(demoFiles);
    const s = a.symbols.find((s) => s.name === "completionRate")!;
    expect(s.steps?.some((x) => x.text.includes("total <= 0"))).toBe(true);
    expect(glossary(s).some((g) => g.term === "Math.round")).toBe(true);
  });
  it("hashes snapshots independently of file list order", async () => {
    expect(await sourceHash(demoFiles)).toBe(
      await sourceHash([...demoFiles].reverse()),
    );
    expect(await sourceHash(demoFiles)).not.toBe(
      await sourceHash([{ path: "other.ts", content: "const x=1;" }]),
    );
  });
  it("restores exports by rebuilding references and rejects unsafe data", () => {
    const raw = {
      id: "cfeb7933-b703-493a-8418-b04039f10f38",
      name: "Trail",
      origin: "sample",
      importedAt: new Date().toISOString(),
      files: demoFiles,
      completed: ["invented"],
      attempts: [],
      drafts: { invented: "x" },
    };
    const prefs = { level: "beginner", goal: "understand" } as Preferences;
    const p = restoreBackup(raw, prefs);
    expect(p.completed).toEqual([]);
    expect(p.drafts).toEqual({});
    expect(p.analysis.symbols.length).toBeGreaterThan(0);
    expect(achievements([p]).every((a) => !a.earned)).toBe(true);
    expect(() =>
      restoreBackup(
        { ...raw, files: [{ path: "../secret.ts", content: "x" }] },
        prefs,
      ),
    ).toThrow();
  });
});
