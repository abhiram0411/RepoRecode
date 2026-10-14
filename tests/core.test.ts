import { describe, it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
import { roadmap } from "../src/core/lessons";
import { demoFiles } from "../src/core/demo";
import { evaluate } from "../src/core/evaluate";
import {
  allowed,
  githubRepo,
  safePath,
  validateFiles,
  zipImport,
} from "../src/core/import";
import { strToU8, zipSync } from "fflate";
describe("source intelligence", () => {
  it("discovers actual declarations and exact source ranges", () => {
    const a = analyze(demoFiles);
    expect(a.framework).toBe("React");
    const s = a.symbols.find((s) => s.name === "completionRate")!;
    expect(s.standalone).toBe(true);
    expect(s.line).toBe(2);
    expect(
      demoFiles.find((f) => f.path === s.file)!.content.slice(s.start, s.end),
    ).toBe(s.code);
    expect(a.symbols.find((s) => s.name === "TrailCard")!.kind).toBe(
      "component",
    );
    expect(
      a.edges.some(
        (e) =>
          e.source === "src/App.tsx" &&
          e.target === "src/components/TrailCard.tsx",
      ),
    ).toBe(true);
  });
  it("does not invent cross-file calls with duplicate names", () => {
    const a = analyze([
      {
        path: "a.ts",
        content:
          "function run(x: number) {return x;} function call(x:number){return run(x);}",
      },
      { path: "b.ts", content: "function run(x: number) {return x+2;}" },
    ]);
    expect(a.edges.filter((e) => e.kind === "calls")).toHaveLength(1);
    expect(a.edges[0].target.startsWith("a.ts")).toBe(true);
  });
  it("denies closures and project-dependent practice", () => {
    const a = analyze([
      {
        path: "a.ts",
        content:
          "const secret = 2; export function f(x:number){return x+secret;}",
      },
    ]);
    expect(a.symbols[0].standalone).toBe(false);
    expect(a.symbols[0].reason).toContain("secret");
  });
  it("personalizes real source lessons with ordered prerequisites", () => {
    const a = analyze(demoFiles);
    const path = roadmap(a, { level: "beginner", goal: "debug" });
    expect(path[0].title).toContain("Trace");
    expect(
      path.every((l) =>
        (l.prerequisites ?? []).every((id) =>
          a.edges.some(
            (e) => e.source === l.id && e.target === id && e.kind === "calls",
          ),
        ),
      ),
    ).toBe(true);
    expect(path.every((l) => a.symbols.some((s) => s.id === l.symbolId))).toBe(
      true,
    );
  });
});
describe("import boundaries", () => {
  it.each(["../secret.ts", "C:/a.ts", "/a.ts", "x/../a.ts", "a\\b.ts"])(
    "rejects unsafe path %s",
    (p) => expect(safePath(p)).toBe(false),
  );
  it("excludes environment, dependencies and generated files", () => {
    expect(allowed(".env")).toBe(false);
    expect(allowed("node_modules/a.ts")).toBe(false);
    expect(allowed("src/a.tsx")).toBe(true);
  });
  it("rejects duplicates and oversized files", () => {
    expect(() =>
      validateFiles([{ path: "a.ts", content: "a".repeat(1300000) }]),
    ).toThrow();
    expect(() =>
      validateFiles([
        { path: "a.ts", content: "" },
        { path: "a.ts", content: "" },
      ]),
    ).toThrow();
  });
  it("pins import requests to GitHub repository coordinates", () => {
    expect(githubRepo("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    for (const u of [
      "http://github.com/a/b",
      "https://evil.com/a/b",
      "https://github.com/a/b/tree/main",
      "https://user@github.com/a/b",
    ])
      expect(() => githubRepo(u)).toThrow();
  });
  it("imports real ZIP source and rejects traversal and bombs", () => {
    const good = zipSync({
      "project/src/a.ts": strToU8("export const a = 1;"),
    });
    expect(zipImport(good)[0].path).toBe("src/a.ts");
    expect(() => zipImport(zipSync({ "../bad.ts": strToU8("x") }))).toThrow();
    expect(() =>
      zipImport(zipSync({ "big.ts": strToU8("x".repeat(200000)) })),
    ).toThrow();
  });
});
describe("behavioral practice", () => {
  const s = analyze(demoFiles).symbols.find(
    (s) => s.name === "completionRate",
  )!;
  it("passes the original against validated probes", async () => {
    const r = await evaluate(s, s.code);
    expect(r.diagnostics.join(" ")).not.toContain("Error");
    expect(r.passed).toBe(true);
    expect(r.cases.length).toBeGreaterThan(10);
  });
  it("accepts an equivalent implementation without string matching", async () => {
    const r = await evaluate(
      s,
      "function completionRate(completed:number,total:number):number { if(total<=0) return 0; const p=Math.round(100*completed/total); if(p<0)return 0; if(p>100)return 100; return p; }",
    );
    expect(r.passed).toBe(true);
  });
  it("rejects wrong results and type errors without rewarding success", async () => {
    expect(
      (
        await evaluate(
          s,
          "function completionRate(completed:number,total:number){return 42;}",
        )
      ).passed,
    ).toBe(false);
    const r = await evaluate(
      s,
      'function completionRate(completed:number,total:number):number{return "wrong";}',
    );
    expect(r.passed).toBe(false);
    expect(r.diagnostics.join(" ")).toContain("not assignable");
  });
  it("interrupts infinite loops", async () => {
    const r = await evaluate(
      s,
      "function completionRate(completed:number,total:number):number {while(true){} }",
    );
    expect(r.passed).toBe(false);
    expect(r.cases[0].actual).toContain("interrupted");
  }, 15000);
  it("cannot access host network or filesystem", async () => {
    const r = await evaluate(
      s,
      'function completionRate(completed:number,total:number):number {return fetch("https://example.com");}',
    );
    expect(r.passed).toBe(false);
    expect(r.diagnostics.join(" ")).toContain("fetch");
  });
  it("rejects unsupported component execution", async () => {
    const c = analyze(demoFiles).symbols.find((s) => s.name === "TrailCard")!;
    expect((await evaluate(c, c.code)).supported).toBe(false);
  });
  it("preserves export text inside string literals", async () => {
    const fn = analyze([
      {
        path: "s.ts",
        content:
          'export function label(value: string): string { return "export default " + value; }',
      },
    ]).symbols[0];
    const r = await evaluate(
      fn,
      'function label(value: string): string {return "export default " + value;}',
    );
    expect(r.passed).toBe(true);
    expect(r.cases[0].expected).toContain("export default");
  });
});
