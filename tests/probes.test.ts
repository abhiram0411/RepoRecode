import { expect, it } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate, probes } from "../src/core/evaluate";

const symbol = (code: string) =>
  analyze([{ path: "a.ts", content: code }]).symbols.find(
    (s) => s.kind === "function",
  )!;

it("covers each parameter's values rather than a truncated Cartesian prefix", () => {
  const s = symbol(
    "export function sum(a:number,b:number,c:number){return a+b+c;}",
  );
  const inputs = probes(s);
  expect(inputs).toHaveLength(64);
  expect(new Set(inputs.map((v) => JSON.stringify(v))).size).toBe(64);
  for (let i = 0; i < 3; i++)
    expect(new Set(inputs.map((v) => v[i])).size).toBe(8);
  expect(probes(s)).toEqual(inputs);
});

it("rejects a solution that ignores the first of three parameters", async () => {
  const s = symbol(
    "export function sum(a:number,b:number,c:number){return a+b+c;}",
  );
  const bad = await evaluate(
    s,
    "function sum(a:number,b:number,c:number){return b+c;}",
  );
  expect(bad.passed).toBe(false);
  expect(bad.cases.some((c) => !c.passed)).toBe(true);
  expect(
    (
      await evaluate(
        s,
        "function sum(a:number,b:number,c:number){return c+a+b;}",
      )
    ).passed,
  ).toBe(true);
});

it("retains exhaustive coverage when the finite product fits the budget", () => {
  const inputs = probes(
    symbol(
      "export function pick(a:boolean,b:boolean,c:boolean){return a&&b&&c;}",
    ),
  );
  expect(inputs).toHaveLength(8);
  expect(inputs).toContainEqual([true, false, true]);
});

it("reports excluded reference inputs instead of concealing partial coverage", async () => {
  const s = symbol(
    "export function nonempty(s:string){return s[0].toUpperCase();}",
  );
  const result = await evaluate(s, s.code);
  expect(result.passed).toBe(true);
  expect(result.diagnostics.join(" ")).toContain(
    "1 probe inputs could not run",
  );
});

it("rejects random reference output even if new sandbox instances share a seed", async () => {
  const s = symbol(
    "export function random(n:number){return n===0?(Math as any).random():1;}",
  );
  const result = await evaluate(s, s.code);
  expect(result.supported).toBe(false);
  expect(result.passed).toBe(false);
  expect(result.diagnostics.join(" ")).toContain("Math.random");
});

it("compares object fields independently of insertion order", async () => {
  const s = symbol(
    "export function record(n:number){return {value:n,double:n*2};}",
  );
  const result = await evaluate(
    s,
    "function record(n:number){return {double:2*n,value:n};}",
  );
  expect(result.passed).toBe(true);
});

it("does not confuse undefined, null and missing fields after JSON serialization", async () => {
  const s = symbol(
    "export function record(n:number){return {value:undefined};}",
  );
  for (const code of [
    "function record(n:number){return {};}",
    "function record(n:number){return {value:null};}",
  ])
    expect((await evaluate(s, code)).passed).toBe(false);
  expect((await evaluate(s, s.code)).passed).toBe(true);
});

it("rejects callable return values instead of passing all functions as identical JSON", async () => {
  const s = symbol("export function factory(n:number){return ()=>n;}");
  const result = await evaluate(
    s,
    "function factory(n:number){return ()=>42;}",
  );
  expect(result.supported).toBe(false);
  expect(result.passed).toBe(false);
  expect(result.diagnostics.join(" ")).toContain(
    "functions, symbols and bigints",
  );
});

it("keeps nonfinite numbers distinct from lookalike object values", async () => {
  const s = symbol("export function record(n:number){return {value:NaN};}");
  expect(
    (
      await evaluate(
        s,
        "function record(n:number){return {value:{nonfinite:'NaN'}};}",
      )
    ).passed,
  ).toBe(false);
  expect((await evaluate(s, s.code)).passed).toBe(true);
});

it("keeps user declaration names separate from the evaluation harness", async () => {
  const s = symbol("export function __rrEncodeOutput(n:number){return n*2;}");
  expect((await evaluate(s,s.code)).passed).toBe(true);
  expect((await evaluate(s,"function __rrEncodeOutput(n:number){return 99;}")).passed).toBe(false);
});
