import { expect, it } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { readAnalysisSeed, selectAnalysisSeed } from "../src/core/analysisSeed";
import { ANALYSIS_VERSION } from "../src/core/analysisVersion";
import type { Project, SourceFile } from "../src/core/types";

const files = [
  { path: "type.ts", content: "export type Flag=boolean" },
  { path: "barrel.ts", content: "export type {Flag} from './type'" },
  {
    path: "app.ts",
    content:
      "import type {Flag} from './barrel'; export function f(x:Flag){return x}",
  },
  { path: "other.ts", content: "export function other(x:number){return x+1}" },
];
function saved(source: SourceFile[]) {
  return JSON.parse(
    JSON.stringify({
      files: source,
      analysis: analyze(source),
      analysisVersion: ANALYSIS_VERSION,
    }),
  );
}

it("restores saved indexes across worker lifetimes and invalidates transitive dependants", () => {
  const seed = saved(files);
  const changed = [
    { ...files[0], content: "export type Flag='yes'|'no'" },
    ...files.slice(1),
  ];
  const index = createAnalyzer(seed);
  seed.analysis.symbols[0].name = "caller mutation";
  const result = index(changed);
  expect(result.restoredFiles).toBe(4);
  expect(result.parsedFiles).toBe(1);
  expect(result.reusedFiles).toBe(3);
  expect(result.reusedSemanticFiles).toBe(1);
  expect(result.analysis).toEqual(analyze(changed));
  const next = index(changed);
  expect(next.restoredFiles).toBe(0);
  expect(next.reusedSemanticFiles).toBe(4);
});

it("retains bounded generic signatures and imported practice type context", () => {
  const before = [
    {
      path: "types.ts",
      content: "export type Box<T extends number>={value:T}",
    },
    {
      path: "read.ts",
      content:
        "import type {Box} from './types'; export function read<T extends number>(x:Box<T>){return x.value}",
    },
    { path: "other.ts", content: "export const n=1" },
  ];
  const after = [
    ...before.slice(0, 2),
    { ...before[2], content: "export const n=2" },
  ];
  const result = createAnalyzer(saved(before))(after);
  expect(result.reusedSemanticFiles).toBe(2);
  expect(result.analysis).toEqual(analyze(after));
  expect(
    result.analysis.symbols.find((s) => s.name === "read")?.typeParameters,
  ).toContain("extends number");
});

it("rechecks resolution changes, removals and global declarations after reload", () => {
  const app = {
    path: "app.ts",
    content:
      "import {value} from './value'; export function run(){return value()}",
  };
  const unrelated = { path: "other.ts", content: "export const other=1" };
  const target = {
    path: "value/index.ts",
    content: "export function value(){return 1}",
  };
  const snapshots = [
    [app, unrelated],
    [app, unrelated, target],
    [
      app,
      unrelated,
      target,
      { path: "value.ts", content: "export function value(){return 2}" },
    ],
    [app, unrelated],
    [
      app,
      unrelated,
      { path: "global.ts", content: "function shared(){return 1}" },
    ],
    [unrelated, app],
  ];
  for (let i = 1; i < snapshots.length; i++) {
    const result = createAnalyzer(saved(snapshots[i - 1]))(snapshots[i]);
    expect(result.restoredFiles).toBe(snapshots[i - 1].length);
    expect(result.analysis).toEqual(analyze(snapshots[i]));
  }
});

it("preserves diagnostic ownership, nested calls, JSX links and metadata", () => {
  const before = [
    {
      path: "ui.tsx",
      content:
        "export function Child(){return <span/>} export function App(){function inner(){return Child()} return <Child/>}",
    },
    { path: "broken.ts", content: "export const broken = ( ;" },
    { path: "package.json", content: "{" },
  ];
  const after = [
    before[1],
    before[0],
    { path: "package.json", content: '{"dependencies":{"next":"1"}}' },
  ];
  const result = createAnalyzer(saved(before))(after);
  expect(result.restoredFiles).toBe(2);
  expect(result.reusedSemanticFiles).toBe(2);
  expect(result.analysis).toEqual(analyze(after));
});

it("rebuilds truncated facts and recomputes API/state relationships", () => {
  const before = [
    {
      path: "many.ts",
      content:
        "export {};" +
        Array.from({ length: 1001 }, (_, i) => `const x${i}=1;`).join(""),
    },
    {
      path: "ui.tsx",
      content:
        "import {useState} from 'react'; export function App(){const [n,setN]=useState(0); fetch('/api/x');return <button onClick={()=>setN(n+1)}>{n}</button>}",
    },
    { path: "server.ts", content: "app.get('/api/x', handler)" },
  ];
  const after = [
    { ...before[0], content: "export const x=1;" },
    ...before.slice(1),
  ];
  const result = createAnalyzer(saved(before))(after);
  expect(result.restoredFiles).toBe(3);
  expect(result.reusedSemanticFiles).toBe(0);
  expect(result.analysis).toEqual(analyze(after));
});

it.each([
  (seed: any) => seed.analysisVersion--,
  (seed: any) => (seed.analysis.symbols[0].code = "wrong source"),
  (seed: any) => (seed.analysis.symbols[0].standalone = "yes"),
  (seed: any) => seed.analysis.symbols.push(seed.analysis.symbols[0]),
  (seed: any) =>
    seed.analysis.edges.push({
      source: "missing",
      target: "missing",
      kind: "calls",
      evidence: "static",
    }),
  (seed: any) => seed.files.push({ ...seed.files[0] }),
  (seed: any) => (seed.files[0].path = "../outside.ts"),
  (seed: any) => seed.analysis.diagnostics.push("unknown source: error"),
  (seed: any) => (seed.extra = "x".repeat(6 * 1024 * 1024)),
])(
  "discards an unusable saved index and completes a fresh analysis",
  (mutate) => {
    const seed = saved(files);
    mutate(seed);
    expect(readAnalysisSeed(seed)).toBeUndefined();
    const result = createAnalyzer(seed)(files);
    expect(result.restoredFiles).toBe(0);
    expect(result.parsedFiles).toBe(files.length);
    expect(result.analysis).toEqual(analyze(files));
  },
);

it("chooses the current-version project with the most identical source and retains no deleted project", () => {
  const small = saved(files.slice(0, 1)) as Project;
  const large = saved(files) as Project;
  const old = { ...large, analysisVersion: ANALYSIS_VERSION - 1 };
  expect(selectAnalysisSeed([small, old, large], files)?.files).toEqual(files);
  expect(selectAnalysisSeed([old], files)).toBeUndefined();
  expect(selectAnalysisSeed([], files)).toBeUndefined();
  expect(
    selectAnalysisSeed(
      [large],
      [{ path: "unrelated.ts", content: "export const x=1" }],
    ),
  ).toBeUndefined();
});
