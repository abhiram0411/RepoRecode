import { describe, expect, it, vi } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { AnalysisSession } from "../src/core/analysisSession";
import type { SourceFile } from "../src/core/types";

describe("incremental source parsing", () => {
  it("reuses 199 of 200 files after one bounded project edit", () => {
    const files = Array.from({ length: 200 }, (_, i) => ({
      path: `file${i}.ts`,
      content: `export function value${i}(x:number){return x+${i};}`,
    }));
    const update = createAnalyzer();
    update(files);
    files[100] = {
      ...files[100],
      content: "export function value100(x:number){return x-100;}",
    };
    const result = update(files);
    expect(result).toMatchObject({
      parsedFiles: 1,
      reusedFiles: 199,
      removedFiles: 0,
      reusedSemanticFiles: 199,
    });
    expect(result.analysis).toEqual(analyze(files));
  });

  it("labels state concepts from resolved React hooks instead of same-named locals", () => {
    const a = analyze([
      {
        path: "view.tsx",
        content: `
      import {useReducer as reduce} from 'react';
      export function Real(){const [value] = reduce((x:number)=>x, 0); return <p>{value}</p>;}
      function Other(){function useState(){return 1;} return useState();}
    `,
      },
    ]);
    expect(a.symbols.find((s) => s.name === "Real")?.concepts).toContain(
      "State",
    );
    expect(a.symbols.find((s) => s.name === "Other")?.concepts).not.toContain(
      "State",
    );
  });
  it("reuses exact source, reparses changes and drops removed files while matching a fresh index", () => {
    const update = createAnalyzer();
    const initial: SourceFile[] = [
      { path: "a.ts", content: "export function first(x:number){return x+1;}" },
      {
        path: "b.ts",
        content:
          "import { first } from './a'; export function second(x:number){return first(x);}",
      },
      { path: "package.json", content: '{"dependencies":{"react":"19"}}' },
    ];
    expect(update(initial)).toMatchObject({
      parsedFiles: 2,
      reusedFiles: 0,
      removedFiles: 0,
    });
    const same = update(initial);
    expect(same).toMatchObject({ parsedFiles: 0, reusedFiles: 2 });
    expect(same.analysis).toEqual(analyze(initial));
    const changed = [
      {
        ...initial[0],
        content:
          "// shifted location\nexport function first(x:number){return x+3;}",
      },
      initial[1],
    ];
    const result = update(changed);
    expect(result).toMatchObject({ parsedFiles: 1, reusedFiles: 1 });
    expect(result.analysis).toEqual(analyze(changed));
    expect(result.analysis.framework).toBe("JavaScript / TypeScript");
    expect(
      result.analysis.edges.find((e) => e.kind === "calls")?.target,
    ).toContain("first:20");
    const removed = update([initial[1]]);
    expect(removed).toMatchObject({
      parsedFiles: 0,
      reusedFiles: 1,
      removedFiles: 1,
    });
    expect(removed.analysis).toEqual(analyze([initial[1]]));
    expect(removed.analysis.edges).toEqual([]);
    expect(update(initial)).toMatchObject({ parsedFiles: 1, reusedFiles: 1 });
  });

  it("re-resolves unchanged importers through changed barrels and new resolution candidates", () => {
    const update = createAnalyzer();
    const files = [
      { path: "a.ts", content: "export function f(){return 1;}" },
      { path: "b.ts", content: "export function f(){return 2;}" },
      { path: "barrel/index.ts", content: "export {f} from '../a';" },
      {
        path: "main.ts",
        content: "import {f} from './barrel'; export function g(){return f();}",
      },
    ];
    update(files);
    const changed = files.map((f) =>
      f.path === "barrel/index.ts"
        ? { ...f, content: "export {f} from '../b';" }
        : f,
    );
    const result = update(changed);
    expect(result.reusedFiles).toBe(3);
    expect(result.analysis).toEqual(analyze(changed));
    expect(
      result.analysis.edges.find((e) => e.kind === "calls")?.target,
    ).toContain("b.ts#f");
    const shadow = [
      ...changed,
      { path: "barrel.ts", content: "export {f} from './a';" },
    ];
    expect(update(shadow).analysis).toEqual(analyze(shadow));
  });

  it("keeps nested call ownership and JSX edges without inventing shadowed targets", () => {
    const files = [
      {
        path: "a.tsx",
        content: `
      function helper(){return 1;}
      function outer(){ function inner(){return helper();} return inner(); }
      function shadow(helper:()=>number){return helper();}
      function Child(){return <span/>;}
      export function Parent(){return <Child/>;}
    `,
      },
    ];
    const a = analyze(files);
    const namedEdges = a.edges.map((e) => [
      a.symbols.find((s) => s.id === e.source)?.name,
      a.symbols.find((s) => s.id === e.target)?.name,
      e.kind,
    ]);
    expect(namedEdges).toEqual([
      ["outer", "helper", "calls"],
      ["outer", "inner", "calls"],
      ["inner", "helper", "calls"],
      ["Parent", "Child", "renders"],
    ]);
  });

  it("refreshes diagnostics and global declarations after edits, removals and file reorder", () => {
    const update = createAnalyzer();
    const files = [
      { path: "a.ts", content: "function run(){return external();}" },
      { path: "b.ts", content: "function external(){return 1;}" },
    ];
    update(files);
    for (const next of [
      [...files].reverse(),
      [files[0], { ...files[1], content: "function renamed(){ return ( ;}" }],
      [files[0]],
      files,
    ])
      expect(update(next).analysis).toEqual(analyze(next));
  });
});

class FakeWorker {
  onmessage: Worker["onmessage"] = null;
  onerror: Worker["onerror"] = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  reply(data: unknown) {
    this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent);
  }
}

describe("analysis worker lifetime", () => {
  it("sends a saved seed only to a newly created worker", async () => {
    const worker = new FakeWorker();
    const session = new AnalysisSession(() => worker as unknown as Worker);
    const result = createAnalyzer()([]);
    const seed = { analysisVersion: 15, files: [], analysis: result.analysis };
    const first = session.request([], 20000, seed);
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      id: 1,
      files: [],
      seed,
    });
    worker.reply({ id: 1, result });
    await first;
    const next = session.request([], 20000, seed);
    expect(worker.postMessage).toHaveBeenLastCalledWith({ id: 2, files: [] });
    worker.reply({ id: 2, result });
    await next;
    session.dispose();
    const retry = session.request([], 20000, seed);
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      id: 3,
      files: [],
      seed,
    });
    worker.reply({ id: 3, result });
    await retry;
    session.dispose();
  });
  it("reuses the worker, ignores stale responses, and rejects overlapping requests", async () => {
    const worker = new FakeWorker();
    const factory = vi.fn(() => worker as unknown as Worker);
    const session = new AnalysisSession(factory);
    const result = createAnalyzer()([]);
    const first = session.request([]);
    await expect(session.request([])).rejects.toThrow("already running");
    worker.reply({ id: 1, result });
    await expect(first).resolves.toEqual(result);
    const second = session.request([]);
    worker.reply({ id: 1, error: "stale" });
    worker.reply({ id: 2, result });
    await expect(second).resolves.toEqual(result);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(worker.terminate).not.toHaveBeenCalled();
    session.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("terminates timed-out work and starts a fresh cache on retry", async () => {
    vi.useFakeTimers();
    try {
      const workers: FakeWorker[] = [];
      const session = new AnalysisSession(() => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker as unknown as Worker;
      });
      const result = createAnalyzer()([]);
      const first = expect(session.request([], 20)).rejects.toThrow(
        "timed out",
      );
      await vi.advanceTimersByTimeAsync(20);
      await first;
      expect(workers[0].terminate).toHaveBeenCalledTimes(1);
      const retry = session.request([]);
      workers[1].reply({ id: 2, result });
      await expect(retry).resolves.toEqual(result);
      const pending = expect(session.request([])).rejects.toThrow("ended");
      session.dispose();
      await pending;
      expect(workers[1].terminate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
