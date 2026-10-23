import { it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";

it("invalidates transitive imports and leaves unrelated declaration/call indexes reusable", () => {
  const index = createAnalyzer();
  const files = [
    { path: "type.ts", content: "export type Flag=boolean" },
    { path: "barrel.ts", content: "export type {Flag} from './type'" },
    {
      path: "app.ts",
      content:
        "import type {Flag} from './barrel';export function f(x:Flag){return x}",
    },
    {
      path: "other.ts",
      content: "export function other(x:number){return x+1}",
    },
  ];
  index(files);
  const changed = [
    { ...files[0], content: "export type Flag='yes'|'no'" },
    ...files.slice(1),
  ];
  const result = index(changed);
  expect(result.reusedSemanticFiles).toBe(1);
  expect(result.analysis).toEqual(analyze(changed));
  expect(
    result.analysis.symbols.find((s) => s.name === "f")?.practiceTypes,
  ).toContain("'yes'");
});

it("handles unresolved imports, removed targets and new higher-priority resolution candidates", () => {
  const index = createAnalyzer();
  const main = {
    path: "app.ts",
    content: "import {f} from './value';export function call(){return f()}",
  };
  const other = {
    path: "other.ts",
    content: "export function other(){return 1}",
  };
  index([main, other]);
  const target = {
    path: "value/index.ts",
    content: "export function f(){return 2}",
  };
  const snapshots = [
    [main, other, target],
    [
      main,
      other,
      target,
      { path: "value.ts", content: "export function f(){return 3}" },
    ],
    [main, other],
  ];
  for (const [i, files] of snapshots.entries()) {
    const result = index(files);
    expect(result.reusedSemanticFiles).toBe([1, 2, 1][i]);
    expect(result.analysis).toEqual(analyze(files));
  }
});

it("invalidates cycles together", () => {
  const index = createAnalyzer();
  const files = [
    {
      path: "a.ts",
      content: "import {b} from './b';export function a(){return b()}",
    },
    {
      path: "b.ts",
      content: "import {a} from './a';export function b(){return a()}",
    },
  ];
  index(files);
  const changed = [
    { ...files[0], content: files[0].content + "\nexport const value=1" },
    files[1],
  ];
  expect(index(changed).reusedSemanticFiles).toBe(0);
  expect(index(changed).analysis).toEqual(analyze(changed));
});

it("falls back for global augmentations and restores reuse when global files disappear", () => {
  const index = createAnalyzer();
  const app = {
    path: "app.ts",
    content: "export function f(){return shared()}",
  };
  const global = { path: "global.ts", content: "function shared(){return 1}" };
  index([app, global]);
  for (const files of [
    [app, { ...global, content: "function shared(){return 2}" }],
    [app],
  ]) {
    const result = index(files);
    expect(result.reusedSemanticFiles).toBe(0);
    expect(result.analysis).toEqual(analyze(files));
  }
  expect(index([app]).reusedSemanticFiles).toBe(1);
  const augmented = [
    app,
    {
      path: "augment.ts",
      content: "export {};declare global{function shared():number}",
    },
  ];
  expect(index(augmented).reusedSemanticFiles).toBe(0);
  expect(index([...augmented].reverse()).analysis).toEqual(
    analyze([...augmented].reverse()),
  );
});

it("does not let caller mutations poison cached symbols, facts or edges", () => {
  const index = createAnalyzer();
  const files = [
    { path: "a.ts", content: "export function a(){const n=1;return n}" },
    {
      path: "b.ts",
      content: "import {a} from './a';export function b(){return a()}",
    },
  ];
  const first = index(files).analysis;
  first.symbols[0].name = "corrupted";
  first.edges.length = 0;
  first.facts![0].detail = "corrupted";
  expect(index(files).analysis).toEqual(analyze(files));
});

it("preserves global fact limits after reordered or shortened files", () => {
  const index = createAnalyzer();
  const files = [
    {
      path: "a.ts",
      content:
        "export {};" +
        Array.from({ length: 1001 }, (_, i) => `const a${i}=0;`).join(""),
    },
    {
      path: "b.ts",
      content: "export function b(){const value=3;return value}",
    },
  ];
  expect(index(files).analysis.facts).toHaveLength(1000);
  for (const changed of [
    [...files].reverse(),
    [{ ...files[0], content: "export const a=1;" }, files[1]],
  ]) {
    const result = index(changed);
    expect(result.reusedSemanticFiles).toBe(0);
    expect(result.analysis).toEqual(analyze(changed));
  }
});

it("refreshes package metadata while reusing source semantics and preserves input order", () => {
  const index = createAnalyzer();
  const files = [
    { path: "a.ts", content: "export function a(){return 1}" },
    { path: "b.ts", content: "export function b(){return 2}" },
  ];
  index(files);
  const changed = [...files]
    .reverse()
    .concat([
      { path: "package.json", content: '{"dependencies":{"next":"1"}}' },
    ]);
  const result = index(changed);
  expect(result.reusedSemanticFiles).toBe(2);
  expect(result.analysis).toEqual(analyze(changed));
  expect(result.analysis.framework).toBe("Next.js");
});
